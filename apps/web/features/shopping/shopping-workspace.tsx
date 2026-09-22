"use client";

import { FormEvent, useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type PlannedMeal = {
  id: string;
  plannedDate: string;
  mealName: string | null;
  recipe: { id: string; name: string; status: "ACTIVE" | "ARCHIVED" };
};
type Unit = { id: string; name: string; abbreviation: string };
type ShoppingItem = {
  id: string;
  ingredientId: string | null;
  variantId: string | null;
  manualName: string | null;
  quantity: string | null;
  unitId: string | null;
  observations: string | null;
  optional: boolean;
  purchased: boolean;
  ingredient: { id: string; name: string } | null;
  variant: { id: string; name: string } | null;
  unit: Unit | null;
  sources: Array<{ recipeName: string; plannedDate: string }>;
};
type ShoppingList = {
  id: string;
  name: string;
  sourceFrom: string | null;
  sourceTo: string | null;
  sources: Array<{
    plannedMealId: string;
    recipeName: string;
    plannedDate: string;
  }>;
  items: ShoppingItem[];
};

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

async function errorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  return Array.isArray(body.message)
    ? body.message.join(", ")
    : (body.message ?? fallback);
}

export function ShoppingWorkspace() {
  const initialDate = today();
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [name, setName] = useState("Compra semanal");
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [current, setCurrent] = useState<ShoppingList | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualUnitId, setManualUnitId] = useState("");
  const [manualObservations, setManualObservations] = useState("");
  const [manualOptional, setManualOptional] = useState(false);
  const [message, setMessage] = useState(
    "Selecciona un intervalo para preparar la compra.",
  );

  const safely = (action: () => Promise<void>) =>
    action().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Ha ocurrido un error",
      ),
    );

  async function loadPlanning() {
    const response = await fetch(
      `${apiUrl}/planned-meals?from=${from}&to=${to}`,
    );
    if (!response.ok) throw new Error("No se pudo cargar la planificación");
    setPlannedMeals((await response.json()) as PlannedMeal[]);
    setExcluded([]);
    setMessage("Selecciona las comidas que contribuirán a la lista.");
  }

  async function loadLists() {
    const [listResponse, unitResponse] = await Promise.all([
      fetch(`${apiUrl}/shopping-lists`),
      fetch(`${apiUrl}/catalog/units`),
    ]);
    if (!listResponse.ok || !unitResponse.ok)
      throw new Error("No se pudieron cargar las listas de compra");
    setLists((await listResponse.json()) as ShoppingList[]);
    setUnits((await unitResponse.json()) as Unit[]);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${apiUrl}/shopping-lists/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        from,
        to,
        excludedPlannedMealIds: excluded,
      }),
    });
    if (!response.ok)
      throw new Error(await errorMessage(response, "No se pudo generar"));
    const list = (await response.json()) as ShoppingList;
    setCurrent(list);
    await loadLists();
    setMessage("Lista generada como una instantánea independiente.");
  }

  async function openList(id: string) {
    const response = await fetch(`${apiUrl}/shopping-lists/${id}`);
    if (!response.ok) throw new Error("No se pudo abrir la lista");
    setCurrent((await response.json()) as ShoppingList);
  }

  async function addManual(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    const response = await fetch(
      `${apiUrl}/shopping-lists/${current.id}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualName,
          ...(manualQuantity ? { quantity: manualQuantity } : {}),
          ...(manualUnitId ? { unitId: manualUnitId } : {}),
          ...(manualObservations ? { observations: manualObservations } : {}),
          optional: manualOptional,
          purchased: false,
        }),
      },
    );
    if (!response.ok)
      throw new Error(await errorMessage(response, "No se pudo añadir"));
    setManualName("");
    setManualQuantity("");
    setManualUnitId("");
    setManualObservations("");
    setManualOptional(false);
    await openList(current.id);
    setMessage("Elemento manual añadido sin modificar el catálogo.");
  }

  async function saveItem(item: ShoppingItem, update: Partial<ShoppingItem>) {
    if (!current) return;
    const next = { ...item, ...update };
    const response = await fetch(
      `${apiUrl}/shopping-lists/${current.id}/items/${item.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(next.ingredientId ? { ingredientId: next.ingredientId } : {}),
          ...(next.variantId ? { variantId: next.variantId } : {}),
          ...(next.manualName ? { manualName: next.manualName } : {}),
          ...(next.quantity ? { quantity: next.quantity } : {}),
          ...(next.unitId ? { unitId: next.unitId } : {}),
          ...(next.observations ? { observations: next.observations } : {}),
          optional: next.optional,
          purchased: next.purchased,
        }),
      },
    );
    if (!response.ok)
      throw new Error(await errorMessage(response, "No se pudo editar"));
    await openList(current.id);
  }

  async function removeItem(itemId: string) {
    if (!current || !window.confirm("¿Retirar este elemento?")) return;
    const response = await fetch(
      `${apiUrl}/shopping-lists/${current.id}/items/${itemId}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw new Error("No se pudo retirar el elemento");
    await openList(current.id);
  }

  const toggleExcluded = (id: string) =>
    setExcluded((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((value) => value !== id)
        : [...currentIds, id],
    );

  return (
    <main className="shell shopping-shell">
      <header>
        <span className="eyebrow">Sprint 6</span>
        <h1>Lista de compra</h1>
        <p>
          Genera una instantánea desde tu planificación y edítala libremente.
        </p>
      </header>

      <section className="panel recipe">
        <div className="panel-title">
          <h2>Origen planificado</h2>
          <button onClick={() => void safely(loadPlanning)}>
            Consultar intervalo
          </button>
        </div>
        <div className="row">
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Nombre de la lista
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <div className="meal-selection">
          {plannedMeals.length === 0 && <p>No hay comidas en el intervalo.</p>}
          {plannedMeals.map((meal) => (
            <label key={meal.id}>
              <input
                type="checkbox"
                checked={!excluded.includes(meal.id)}
                onChange={() => toggleExcluded(meal.id)}
              />
              {meal.plannedDate} · {meal.mealName || "Sin denominación"} ·{" "}
              {meal.recipe.name}
            </label>
          ))}
        </div>
        <form onSubmit={(event) => void safely(() => generate(event))}>
          <button className="primary" type="submit">
            Generar nueva lista
          </button>
        </form>
      </section>

      <section className="panel recipe shopping-lists">
        <div className="panel-title">
          <h2>Listas guardadas</h2>
          <button onClick={() => void safely(loadLists)}>Actualizar</button>
        </div>
        {lists.map((list) => (
          <button
            className="recipe-card"
            key={list.id}
            onClick={() => void safely(() => openList(list.id))}
          >
            {list.name}
          </button>
        ))}
      </section>

      {current && (
        <section className="panel recipe shopping-detail">
          <h2>{current.name}</h2>
          {current.sourceFrom && (
            <p>
              Instantánea de {current.sourceFrom} a {current.sourceTo} ·{" "}
              {current.sources.length} comidas
            </p>
          )}
          {current.items.map((item) => (
            <article
              className={
                item.purchased ? "shopping-item purchased" : "shopping-item"
              }
              key={item.id}
            >
              <label className="purchase-check">
                <input
                  type="checkbox"
                  checked={item.purchased}
                  onChange={() =>
                    void safely(() =>
                      saveItem(item, { purchased: !item.purchased }),
                    )
                  }
                />
                Comprado
              </label>
              <strong>
                {item.ingredient?.name}
                {item.variant ? ` · ${item.variant.name}` : ""}
              </strong>
              {item.manualName !== null && (
                <label>
                  Nombre
                  <input
                    value={item.manualName}
                    onChange={(event) =>
                      setCurrent({
                        ...current,
                        items: current.items.map((candidate) =>
                          candidate.id === item.id
                            ? { ...candidate, manualName: event.target.value }
                            : candidate,
                        ),
                      })
                    }
                  />
                </label>
              )}
              <label>
                Cantidad
                <input
                  value={item.quantity ?? ""}
                  onChange={(event) =>
                    setCurrent({
                      ...current,
                      items: current.items.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              quantity: event.target.value || null,
                            }
                          : candidate,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Observaciones
                <textarea
                  value={item.observations ?? ""}
                  onChange={(event) =>
                    setCurrent({
                      ...current,
                      items: current.items.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              observations: event.target.value || null,
                            }
                          : candidate,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Unidad
                <select
                  value={item.unitId ?? ""}
                  onChange={(event) =>
                    setCurrent({
                      ...current,
                      items: current.items.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              unitId: event.target.value || null,
                            }
                          : candidate,
                      ),
                    })
                  }
                >
                  <option value="">Sin unidad</option>
                  {units.map((unit) => (
                    <option value={unit.id} key={unit.id}>
                      {unit.name} ({unit.abbreviation})
                    </option>
                  ))}
                </select>
              </label>
              <label className="purchase-check">
                <input
                  type="checkbox"
                  checked={item.optional}
                  onChange={() =>
                    void safely(() =>
                      saveItem(item, { optional: !item.optional }),
                    )
                  }
                />
                Opcional
              </label>
              {item.sources.length > 0 && (
                <small>
                  Origen:{" "}
                  {[
                    ...new Set(
                      item.sources.map(
                        (source) =>
                          `${source.recipeName} (${source.plannedDate})`,
                      ),
                    ),
                  ].join(", ")}
                </small>
              )}
              <div>
                <button
                  className="quiet"
                  onClick={() => void safely(() => saveItem(item, {}))}
                >
                  Guardar
                </button>
                <button
                  className="quiet"
                  onClick={() => void safely(() => removeItem(item.id))}
                >
                  Retirar
                </button>
              </div>
            </article>
          ))}

          <form
            className="manual-item-form"
            onSubmit={(event) => void safely(() => addManual(event))}
          >
            <h3>Añadir elemento libre</h3>
            <label>
              Nombre
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                required
              />
            </label>
            <label>
              Cantidad
              <input
                value={manualQuantity}
                onChange={(e) => setManualQuantity(e.target.value)}
              />
            </label>
            <label>
              Unidad
              <select
                value={manualUnitId}
                onChange={(e) => setManualUnitId(e.target.value)}
              >
                <option value="">Sin unidad</option>
                {units.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Observaciones
              <input
                value={manualObservations}
                onChange={(e) => setManualObservations(e.target.value)}
              />
            </label>
            <label className="purchase-check">
              <input
                type="checkbox"
                checked={manualOptional}
                onChange={(e) => setManualOptional(e.target.checked)}
              />
              Opcional
            </label>
            <button className="primary" type="submit">
              Añadir
            </button>
          </form>
        </section>
      )}
      <p className="status" role="status">
        {message}
      </p>
    </main>
  );
}
