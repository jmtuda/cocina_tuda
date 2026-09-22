"use client";

import { FormEvent, useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type RecipeSummary = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
};
type PlannedMeal = {
  id: string;
  recipeId: string;
  plannedDate: string;
  mealName: string | null;
  recipe: RecipeSummary;
};
type RecipeDetail = RecipeSummary & {
  description: string | null;
  steps: Array<{ id: string; text: string }>;
};

const pad = (value: number) => String(value).padStart(2, "0");
const fromUtcDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const toUtcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function addCalendarDays(value: string, amount: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtcDate(date);
}

export function startOfCalendarWeek(value: string) {
  const date = toUtcDate(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addCalendarDays(value, -mondayOffset);
}

export const calendarWeek = (start: string) =>
  Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const dayLabel = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toUtcDate(value));

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  return Array.isArray(body.message)
    ? body.message.join(", ")
    : (body.message ?? fallback);
}

export function PlanningWorkspace() {
  const initialDay = today();
  const [weekStart, setWeekStart] = useState(startOfCalendarWeek(initialDay));
  const [dateTarget, setDateTarget] = useState(initialDay);
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [plannedDate, setPlannedDate] = useState(initialDay);
  const [mealName, setMealName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [message, setMessage] = useState(
    "Carga la semana para consultar la planificación.",
  );

  const safely = (action: () => Promise<void>) =>
    action().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Ha ocurrido un error",
      ),
    );

  async function loadRecipes() {
    const response = await fetch(
      `${apiUrl}/recipes?status=ACTIVE&page=1&pageSize=100`,
    );
    if (!response.ok) throw new Error("No se pudieron cargar las recetas");
    const result = (await response.json()) as { items: RecipeSummary[] };
    setRecipes(result.items);
    if (!recipeId && result.items[0]) setRecipeId(result.items[0].id);
  }

  async function loadWeek(start = weekStart) {
    const end = addCalendarDays(start, 6);
    const response = await fetch(
      `${apiUrl}/planned-meals?from=${start}&to=${end}`,
    );
    if (!response.ok) throw new Error("No se pudo cargar la planificación");
    setMeals((await response.json()) as PlannedMeal[]);
    setMessage(`Semana ${start} — ${end}.`);
  }

  async function initialize() {
    await Promise.all([loadRecipes(), loadWeek()]);
  }

  async function moveWeek(amount: number) {
    const next = addCalendarDays(weekStart, amount * 7);
    setWeekStart(next);
    setPlannedDate(next);
    await loadWeek(next);
  }

  async function goToDate() {
    const next = startOfCalendarWeek(dateTarget);
    setWeekStart(next);
    setPlannedDate(dateTarget);
    await loadWeek(next);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(
      `${apiUrl}/planned-meals${editingId ? `/${editingId}` : ""}`,
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          plannedDate,
          mealName: mealName.trim() || null,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(await responseError(response, "No se pudo guardar"));
    }
    setEditingId("");
    setMealName("");
    await loadWeek();
    setMessage(editingId ? "Planificación actualizada." : "Comida añadida.");
  }

  function edit(meal: PlannedMeal) {
    setEditingId(meal.id);
    setRecipeId(meal.recipeId);
    setPlannedDate(meal.plannedDate);
    setMealName(meal.mealName ?? "");
    if (
      meal.recipe.status === "ARCHIVED" &&
      !recipes.some((recipe) => recipe.id === meal.recipe.id)
    ) {
      setRecipes((current) => [...current, meal.recipe]);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Retirar esta comida planificada?")) return;
    const response = await fetch(`${apiUrl}/planned-meals/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("No se pudo retirar la planificación");
    if (editingId === id) setEditingId("");
    await loadWeek();
    setMessage("Planificación retirada definitivamente.");
  }

  async function openRecipe(id: string) {
    const response = await fetch(`${apiUrl}/recipes/${id}`);
    if (!response.ok) throw new Error("No se pudo consultar la receta");
    setDetail((await response.json()) as RecipeDetail);
  }

  const days = calendarWeek(weekStart);

  return (
    <main className="shell planning-shell">
      <header>
        <span className="eyebrow">Sprint 5</span>
        <h1>Plan semanal</h1>
        <p>Asocia recetas a días sin alterar tu biblioteca.</p>
      </header>

      <section className="panel recipe">
        <div className="panel-title">
          <h2>Semana</h2>
          <button onClick={() => void safely(initialize)}>Actualizar</button>
        </div>
        <div className="week-navigation">
          <button onClick={() => void safely(() => moveWeek(-1))}>
            Semana anterior
          </button>
          <strong>
            {weekStart} — {addCalendarDays(weekStart, 6)}
          </strong>
          <button onClick={() => void safely(() => moveWeek(1))}>
            Semana siguiente
          </button>
          <label>
            Ir a fecha
            <input
              type="date"
              value={dateTarget}
              onChange={(event) => setDateTarget(event.target.value)}
            />
          </label>
          <button onClick={() => void safely(goToDate)}>Ir</button>
        </div>

        <div className="week-grid">
          {days.map((day) => {
            const dayMeals = meals.filter((meal) => meal.plannedDate === day);
            return (
              <article className="day-card" key={day}>
                <h3>{dayLabel(day)}</h3>
                {dayMeals.length === 0 && <p>Día vacío</p>}
                {dayMeals.map((meal) => (
                  <div className="planned-meal" key={meal.id}>
                    <strong>{meal.mealName || "Sin denominación"}</strong>
                    <span>
                      {meal.recipe.name}
                      {meal.recipe.status === "ARCHIVED" && " · Archivada"}
                    </span>
                    <div>
                      <button
                        className="quiet"
                        onClick={() =>
                          void safely(() => openRecipe(meal.recipeId))
                        }
                      >
                        Consultar receta
                      </button>
                      <button className="quiet" onClick={() => edit(meal)}>
                        Editar
                      </button>
                      <button
                        className="quiet"
                        onClick={() => void safely(() => remove(meal.id))}
                      >
                        Retirar
                      </button>
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </section>

      <form
        className="panel planning-form"
        onSubmit={(event) => void safely(() => save(event))}
      >
        <h2>{editingId ? "Editar comida" : "Añadir comida"}</h2>
        <label>
          Fecha
          <input
            type="date"
            value={plannedDate}
            onChange={(event) => setPlannedDate(event.target.value)}
            required
          />
        </label>
        <label>
          Receta activa
          <select
            value={recipeId}
            onChange={(event) => setRecipeId(event.target.value)}
            required
          >
            <option value="">Selecciona una receta</option>
            {recipes.map((recipe) => (
              <option
                key={recipe.id}
                value={recipe.id}
                disabled={recipe.status === "ARCHIVED"}
              >
                {recipe.name}
                {recipe.status === "ARCHIVED" ? " (archivada)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Denominación opcional
          <input
            value={mealName}
            maxLength={120}
            placeholder="Cena, merienda, invitados…"
            onChange={(event) => setMealName(event.target.value)}
          />
        </label>
        <button className="primary" type="submit">
          {editingId ? "Guardar cambios" : "Añadir al plan"}
        </button>
      </form>

      {detail && (
        <section className="panel recipe-detail">
          <div className="panel-title">
            <h2>{detail.name}</h2>
            <button className="quiet" onClick={() => setDetail(null)}>
              Cerrar
            </button>
          </div>
          {detail.status === "ARCHIVED" && <p>Receta archivada</p>}
          {detail.description && <p>{detail.description}</p>}
          <ol>
            {detail.steps.map((step) => (
              <li key={step.id}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}
      <p className="status" role="status">
        {message}
      </p>
    </main>
  );
}
