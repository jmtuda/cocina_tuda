export type ShoppingContribution = {
  plannedMealId: string;
  recipeId: string;
  recipeIngredientId: string;
  ingredientId: string;
  ingredientName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: string | null;
  unitId: string | null;
  unitName: string | null;
  unitAbbreviation: string | null;
  optional: boolean;
  observations: string | null;
};

export type GeneratedShoppingItem = Omit<
  ShoppingContribution,
  'plannedMealId' | 'recipeId' | 'recipeIngredientId' | 'quantity'
> & {
  quantity: string | null;
  sources: Array<{
    plannedMealId: string;
    recipeIngredientId: string;
  }>;
};

const quantityPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isShoppingDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function shoppingDateToUtc(value: string) {
  if (!isShoppingDate(value)) throw new Error('Fecha no válida');
  return new Date(`${value}T00:00:00.000Z`);
}

export function utcToShoppingDate(value: Date) {
  return [
    value.getUTCFullYear().toString().padStart(4, '0'),
    (value.getUTCMonth() + 1).toString().padStart(2, '0'),
    value.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function normalizeShoppingName(value: string, label = 'El nombre') {
  const result = value.trim().replace(/\s+/g, ' ');
  if (!result) throw new Error(`${label} es obligatorio`);
  if (result.length > 160)
    throw new Error(`${label} no puede superar 160 caracteres`);
  return result;
}

export function normalizeQuantity(value?: string | null) {
  if (value == null || value === '') return null;
  if (!quantityPattern.test(value)) throw new Error('Cantidad no válida');
  return formatThousandths(toThousandths(value));
}

function toThousandths(value: string) {
  const [whole, fraction = ''] = value.split('.');
  if (whole === undefined) throw new Error('Cantidad no válida');
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
}

function formatThousandths(value: bigint) {
  const whole = value / 1000n;
  const fraction = (value % 1000n).toString().padStart(3, '0');
  return fraction === '000'
    ? whole.toString()
    : `${whole}.${fraction.replace(/0+$/, '')}`;
}

const contributionKey = (item: ShoppingContribution) =>
  [
    item.ingredientId,
    item.variantId ?? '-',
    item.unitId ?? '-',
    item.optional ? 'optional' : 'required',
    item.quantity == null ? 'unknown' : 'known',
  ].join('|');

export function consolidateContributions(
  contributions: ShoppingContribution[],
): GeneratedShoppingItem[] {
  const grouped = new Map<
    string,
    GeneratedShoppingItem & { observationSet: Set<string> }
  >();
  for (const contribution of contributions) {
    const key = contributionKey(contribution);
    const observation = contribution.observations?.trim() || null;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        ingredientId: contribution.ingredientId,
        ingredientName: contribution.ingredientName,
        variantId: contribution.variantId,
        variantName: contribution.variantName,
        quantity: normalizeQuantity(contribution.quantity),
        unitId: contribution.unitId,
        unitName: contribution.unitName,
        unitAbbreviation: contribution.unitAbbreviation,
        optional: contribution.optional,
        observations: observation,
        observationSet: new Set(observation ? [observation] : []),
        sources: [
          {
            plannedMealId: contribution.plannedMealId,
            recipeIngredientId: contribution.recipeIngredientId,
          },
        ],
      });
      continue;
    }
    if (current.quantity != null && contribution.quantity != null) {
      const quantity = normalizeQuantity(contribution.quantity);
      if (quantity == null) throw new Error('Cantidad no válida');
      current.quantity = formatThousandths(
        toThousandths(current.quantity) + toThousandths(quantity),
      );
    }
    if (observation && !current.observationSet.has(observation)) {
      current.observationSet.add(observation);
      current.observations = [...current.observationSet].join('\n');
    }
    current.sources.push({
      plannedMealId: contribution.plannedMealId,
      recipeIngredientId: contribution.recipeIngredientId,
    });
  }
  return [...grouped.values()].map((value) => {
    const item: Partial<typeof value> = { ...value };
    delete item.observationSet;
    return item as GeneratedShoppingItem;
  });
}
