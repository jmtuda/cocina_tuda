"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, apiUrl, responseError } from "../../lib/api";
import { RecipeModal } from "../recipes/recipe-modal";
import { ShoppingSummary, aggregateShoppingItems } from "./shopping-summary";

type PlannedMeal = {
  id: string;
  plannedDate: string;
  mealName: string | null;
  diners: number;
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

type ShoppingListPage = {
  items: Omit<ShoppingList, "items" | "sources">[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

export function ShoppingWorkspace() {
  const initialDate = today();
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [name, setName] = useState("Compra semanal");
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [lists, setLists] = useState<ShoppingListPage>({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [current, setCurrent] = useState<ShoppingList | null>(null);
  const [summary, setSummary] = useState<ShoppingList | null>(null);
  const [savedCurrent, setSavedCurrent] = useState<ShoppingList | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const listsRequest = useRef(0);
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
    const response = await apiFetch(
      `${apiUrl}/planned-meals?from=${from}&to=${to}`,
    );
    if (!response.ok) throw new Error("No se pudo cargar la planificación");
    setPlannedMeals((await response.json()) as PlannedMeal[]);
    setExcluded([]);
    setMessage("Selecciona las comidas que contribuirán a la lista.");
  }

  async function loadLists(page = 1) {
    const request = ++listsRequest.current;
    const listResponse = await apiFetch(
      `${apiUrl}/shopping-lists?page=${page}&pageSize=20`,
    );
    if (request !== listsRequest.current) return;
    if (!listResponse.ok)
      throw new Error("No se pudieron cargar las listas de compra");
    const result = (await listResponse.json()) as ShoppingListPage;
    if (request === listsRequest.current) setLists(result);
  }

  async function loadUnits() {
    const response = await apiFetch(`${apiUrl}/catalog/units`);
    if (!response.ok) throw new Error("No se pudieron cargar las unidades");
    setUnits((await response.json()) as Unit[]);
  }

  function acceptItem(listId: string, item: ShoppingItem) {
    const apply = (list: ShoppingList | null) => {
      if (list?.id !== listId) return list;
      return {
        ...list,
        items: list.items.some((candidate) => candidate.id === item.id)
          ? list.items.map((candidate) =>
              candidate.id === item.id ? item : candidate,
            )
          : [...list.items, item],
      };
    };
    setCurrent(apply);
    setSavedCurrent(apply);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    const response = await apiFetch(`${apiUrl}/shopping-lists/generate`, {
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
      throw new Error(await responseError(response, "No se pudo generar"));
    const list = (await response.json()) as ShoppingList;
    setCurrent(list);
    setSavedCurrent(list);
    setMessage("Lista generada como una instantánea independiente.");
    try {
      await loadLists();
    } catch {
      setMessage(
        "Lista generada. No se pudo actualizar el listado; pulsa «Actualizar listas».",
      );
    }
  }

  async function openList(id: string) {
    const response = await apiFetch(`${apiUrl}/shopping-lists/${id}`);
    if (!response.ok) throw new Error("No se pudo abrir la lista");
    const list = (await response.json()) as ShoppingList;
    setCurrent(list);
    setSavedCurrent(list);
  }

  async function openSummary() {
    if (!current) return;
    const response = await apiFetch(`${apiUrl}/shopping-lists/${current.id}`);
    if (!response.ok) throw new Error("No se pudo consultar el resumen");
    setSummary((await response.json()) as ShoppingList);
  }

  async function addManual(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    const response = await apiFetch(
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
      throw new Error(await responseError(response, "No se pudo añadir"));
    acceptItem(current.id, (await response.json()) as ShoppingItem);
    setManualName("");
    setManualQuantity("");
    setManualUnitId("");
    setManualObservations("");
    setManualOptional(false);
    setMessage("Elemento manual añadido sin modificar el catálogo.");
  }

  async function saveItem(item: ShoppingItem, update: Partial<ShoppingItem>) {
    if (!current) return;
    const next = { ...item, ...update };
    const response = await apiFetch(
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
      throw new Error(await responseError(response, "No se pudo editar"));
    acceptItem(current.id, (await response.json()) as ShoppingItem);
  }

  async function removeItem(itemId: string) {
    if (!current || !window.confirm("¿Retirar este elemento?")) return;
    const response = await apiFetch(
      `${apiUrl}/shopping-lists/${current.id}/items/${itemId}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw new Error("No se pudo retirar el elemento");
    const listId = current.id;
    const apply = (list: ShoppingList | null) =>
      list?.id === listId
        ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
        : list;
    setCurrent(apply);
    setSavedCurrent(apply);
  }

  const toggleExcluded = (id: string) =>
    setExcluded((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((value) => value !== id)
        : [...currentIds, id],
    );

  useEffect(() => {
    void safely(async () => {
      await Promise.all([loadPlanning(), loadLists(), loadUnits()]);
      setMessage("Listas y planificación cargadas.");
    });
    // El intervalo inicial se carga una vez; las consultas posteriores son explícitas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="shell workspace shopping-shell">
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
              {meal.recipe.name} · {meal.diners ?? 2} comensales
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
          <button
            onClick={() =>
              void safely(async () => {
                await loadLists(lists.page);
                setMessage("Listas actualizadas.");
              })
            }
          >
            Actualizar listas
          </button>
        </div>
        {lists.items.map((list) => (
          <button
            className="recipe-card"
            key={list.id}
            onClick={() => void safely(() => openList(list.id))}
          >
            {list.name}
          </button>
        ))}
        <nav aria-label="Páginas de listas de compra">
          <button
            disabled={lists.page <= 1}
            onClick={() => void safely(() => loadLists(lists.page - 1))}
          >
            Anterior
          </button>
          <span>
            Página {lists.page} de {Math.max(1, lists.totalPages)} ·{" "}
            {lists.total} listas
          </span>
          <button
            disabled={lists.page >= lists.totalPages}
            onClick={() => void safely(() => loadLists(lists.page + 1))}
          >
            Siguiente
          </button>
        </nav>
      </section>

      {current && (
        <section className="panel recipe shopping-detail">
          <div className="panel-title">
            <h2>{current.name}</h2>
            <button type="button" onClick={() => void safely(openSummary)}>
              Ver resumen
            </button>
          </div>
          {current.sourceFrom && (
            <p>
              Instantánea de {current.sourceFrom} a {current.sourceTo} ·{" "}
              {current.sources.length} comidas
            </p>
          )}
          <section aria-label="Totales de compra">
            <ShoppingSummary
              items={
                savedCurrent?.id === current.id
                  ? savedCurrent.items
                  : current.items
              }
              compact
            />
          </section>
          <details className="shopping-editor">
            <summary>Editar cantidades y elementos</summary>
            <p className="shopping-summary-count">
              Guarda los cambios para actualizar los totales.
            </p>
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
          </details>
        </section>
      )}
      {summary && (
        <RecipeModal
          active
          title={summary.name}
          label="Lista de compra"
          className="shopping-summary-modal"
          onClose={() => setSummary(null)}
        >
          <h2>{summary.name}</h2>
          <p className="shopping-summary-count">
            {aggregateShoppingItems(summary.items).length} ingredientes · Total
            de la lista guardada
          </p>
          <ShoppingSummary items={summary.items} compact />
        </RecipeModal>
      )}
      <p className="status" role="status">
        {message}
      </p>
    </div>
  );
}
