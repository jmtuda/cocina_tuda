"use client";

import { FormEvent, useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type Ingredient = { id: string; name: string };
type Unit = { id: string; name: string; abbreviation: string };

export function RecipeWorkspace() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("Conecta los catálogos para empezar.");

  async function refreshCatalogs() {
    const [ingredientResponse, unitResponse] = await Promise.all([
      fetch(`${apiUrl}/catalog/ingredients`),
      fetch(`${apiUrl}/catalog/units`),
    ]);
    if (!ingredientResponse.ok || !unitResponse.ok)
      throw new Error("No se pudo cargar el catálogo");
    const nextIngredients = (await ingredientResponse.json()) as Ingredient[];
    const nextUnits = (await unitResponse.json()) as Unit[];
    setIngredients(nextIngredients);
    setUnits(nextUnits);
    setIngredientId(nextIngredients[0]?.id ?? "");
    setUnitId(nextUnits[0]?.id ?? "");
    setMessage("Catálogos actualizados.");
  }

  async function addCatalogItem(kind: "ingredients" | "units", form: FormData) {
    const body = Object.fromEntries(form.entries());
    const response = await fetch(`${apiUrl}/catalog/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error((await response.json()).message ?? "No se pudo guardar");
    await refreshCatalogs();
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name,
      steps: step ? [{ position: 0, text: step }] : [],
      ingredients: ingredientId
        ? [
            {
              position: 0,
              ingredientId,
              ...(unitId ? { unitId } : {}),
              ...(quantity ? { quantity } : {}),
              optional: false,
            },
          ]
        : [],
    };
    const response = await fetch(
      `${apiUrl}/recipes${recipeId ? `/${recipeId}` : ""}`,
      {
        method: recipeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok)
      throw new Error((await response.json()).message ?? "No se pudo guardar");
    const recipe = (await response.json()) as { id: string };
    setRecipeId(recipe.id);
    setMessage(
      recipeId ? "Receta actualizada." : "Receta creada y persistida.",
    );
  }

  async function archiveRecipe() {
    const response = await fetch(`${apiUrl}/recipes/${recipeId}/archive`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("No se pudo archivar");
    setMessage("Receta archivada sin eliminar sus datos.");
  }

  const safely = (action: () => Promise<void>) =>
    action().catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : "Ha ocurrido un error",
      );
    });

  return (
    <main className="shell">
      <header>
        <span className="eyebrow">Cocina Tuda</span>
        <h1>Tu biblioteca empieza aquí</h1>
        <p>
          Una mesa de trabajo sencilla para catalogar y conservar tus recetas.
        </p>
      </header>
      <section className="panel catalogs">
        <div>
          <h2>Catálogo</h2>
          <button onClick={() => void safely(refreshCatalogs)}>
            Actualizar
          </button>
        </div>
        <form
          action={(form) =>
            void safely(() => addCatalogItem("ingredients", form))
          }
        >
          <label>
            Nuevo ingrediente
            <input name="name" placeholder="Tomate" required />
          </label>
          <button>Agregar</button>
        </form>
        <form
          action={(form) => void safely(() => addCatalogItem("units", form))}
        >
          <label>
            Nueva unidad
            <input name="name" placeholder="Gramo" required />
          </label>
          <label>
            Abreviatura
            <input name="abbreviation" placeholder="g" required />
          </label>
          <button>Agregar</button>
        </form>
      </section>
      <form
        className="panel recipe"
        onSubmit={(event) => void safely(() => saveRecipe(event))}
      >
        <div className="panel-title">
          <div>
            <span className="eyebrow">Receta</span>
            <h2>{recipeId ? "Editar receta" : "Crear receta"}</h2>
          </div>
          {recipeId && (
            <button
              type="button"
              className="quiet"
              onClick={() => void safely(archiveRecipe)}
            >
              Archivar
            </button>
          )}
        </div>
        <label>
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bizcocho de limón"
            required
          />
        </label>
        <label>
          Primer paso
          <textarea
            value={step}
            onChange={(event) => setStep(event.target.value)}
            placeholder="Mezcla los ingredientes secos…"
          />
        </label>
        <div className="row">
          <label>
            Ingrediente
            <select
              value={ingredientId}
              onChange={(event) => setIngredientId(event.target.value)}
            >
              <option value="">Sin ingrediente</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad exacta
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputMode="decimal"
              placeholder="125.5"
            />
          </label>
          <label>
            Unidad
            <select
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="">Sin unidad</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.abbreviation}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary">
          {recipeId ? "Guardar cambios" : "Crear receta"}
        </button>
      </form>
      <p className="status" role="status">
        {message}
        {recipeId && ` ID: ${recipeId}`}
      </p>
    </main>
  );
}
