export type SummaryItem = {
  id: string;
  ingredientId: string | null;
  variantId: string | null;
  manualName: string | null;
  quantity: string | null;
  unitId: string | null;
  optional: boolean;
  purchased: boolean;
  observations: string | null;
  ingredient: { id: string; name: string } | null;
  variant: { id: string; name: string } | null;
  unit: { id: string; name: string; abbreviation: string } | null;
};

type Measure = {
  key: string;
  family: string | null;
  factor: bigint;
  label: string;
};
const normalized = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
function measure(item: SummaryItem): Measure {
  const names = [item.unit?.name ?? "", item.unit?.abbreviation ?? ""].map(
    normalized,
  );
  for (const name of names) {
    if (["g", "gr", "gramo", "gramos"].includes(name))
      return { key: "mass", family: "mass", factor: BigInt(1), label: "g" };
    if (["kg", "kilogramo", "kilogramos", "kilo", "kilos"].includes(name))
      return { key: "mass", family: "mass", factor: BigInt(1000), label: "g" };
    if (["ml", "mililitro", "mililitros"].includes(name))
      return {
        key: "volume",
        family: "volume",
        factor: BigInt(1),
        label: "ml",
      };
    if (["l", "litro", "litros"].includes(name))
      return {
        key: "volume",
        family: "volume",
        factor: BigInt(1000),
        label: "ml",
      };
    if (["ud", "uds", "unidad", "unidades"].includes(name))
      return { key: "count", family: "count", factor: BigInt(1), label: "ud" };
  }
  return {
    key: item.unitId ?? "no-unit",
    family: null,
    factor: BigInt(1),
    label: item.unit?.abbreviation || item.unit?.name || "",
  };
}
function thousandths(value: string) {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value))
    throw new Error("Cantidad guardada no válida");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
function decimal(value: bigint, places = 3) {
  const divisor = BigInt(10) ** BigInt(places);
  const fraction = (value % divisor)
    .toString()
    .padStart(places, "0")
    .replace(/0+$/, "");
  return `${value / divisor}${fraction ? `,${fraction}` : ""}`;
}
function amount(value: bigint, unit: Measure) {
  if (
    (unit.family === "mass" || unit.family === "volume") &&
    value >= BigInt(1000000)
  )
    return `${decimal(value, 6)} ${unit.family === "mass" ? "kg" : "l"}`;
  return `${decimal(value)}${unit.label ? ` ${unit.label}` : ""}`;
}

export function aggregateShoppingItems(items: SummaryItem[]) {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      variant: string | null;
      amounts: Map<string, { unit: Measure; quantity: bigint }>;
      unknownUnits: Set<string>;
      observations: Set<string>;
      count: number;
      optional: number;
      purchased: number;
    }
  >();
  for (const item of items) {
    const key = item.ingredientId
      ? `catalog:${item.ingredientId}:${item.variantId ?? "-"}`
      : `manual:${normalized(item.manualName ?? "")}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        id: key,
        name: item.ingredient?.name ?? item.manualName ?? "",
        variant: item.variant?.name ?? null,
        amounts: new Map(),
        unknownUnits: new Set(),
        observations: new Set(),
        count: 0,
        optional: 0,
        purchased: 0,
      };
      groups.set(key, group);
    }
    group.count++;
    group.optional += Number(item.optional);
    group.purchased += Number(item.purchased);
    if (item.observations?.trim())
      group.observations.add(item.observations.trim());
    const unit = measure(item);
    if (item.quantity == null) {
      // Unknown is an additional requirement, never a zero added to a known total.
      group.unknownUnits.add(item.unit?.abbreviation || item.unit?.name || "");
    } else {
      const current = group.amounts.get(unit.key) ?? {
        unit,
        quantity: BigInt(0),
      };
      current.quantity += thousandths(item.quantity) * unit.factor;
      group.amounts.set(unit.key, current);
    }
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "es") ||
        (a.variant ?? "").localeCompare(b.variant ?? "", "es"),
    )
    .map((group) => ({
      id: group.id,
      name: group.name,
      variant: group.variant,
      quantity: [...group.amounts.values()]
        .map((value) => amount(value.quantity, value.unit))
        .concat(
          [...group.unknownUnits].map(
            (unit) => `Sin cantidad${unit ? ` (${unit})` : ""}`,
          ),
        )
        .join(" + "),
      notes: [
        group.optional === group.count
          ? "Opcional"
          : group.optional
            ? "Incluye opcionales"
            : "",
        group.purchased === group.count
          ? "Comprado"
          : group.purchased
            ? "Parcialmente comprado"
            : "",
        ...group.observations,
      ]
        .filter(Boolean)
        .join(" · "),
      purchased: group.purchased === group.count,
    }));
}

export function ShoppingSummary({
  items,
  compact = false,
}: {
  items: SummaryItem[];
  compact?: boolean;
}) {
  const totals = aggregateShoppingItems(items);
  if (!totals.length) return <p>La lista está vacía.</p>;
  return (
    <ul
      className={`shopping-summary${compact ? " shopping-summary-compact" : ""}`}
    >
      {totals.map((item) => (
        <li key={item.id} className={item.purchased ? "purchased" : undefined}>
          <div>
            <strong>
              {item.name}
              {item.variant ? ` · ${item.variant}` : ""}
            </strong>
            <span>{item.quantity}</span>
          </div>
          {item.notes && <small>{item.notes}</small>}
        </li>
      ))}
    </ul>
  );
}
