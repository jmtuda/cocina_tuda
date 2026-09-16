"use client";

import { FormEvent, useState } from "react";
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
type Named = { id: string; name: string };
type Ingredient = Named & { variants: Named[] };
type Unit = Named & { abbreviation: string };
type Summary = Named & {
  status: "ACTIVE" | "ARCHIVED";
  categories: Array<{ category: Named }>;
  tags: Array<{ tag: Named }>;
};
const selected = (event: React.ChangeEvent<HTMLSelectElement>) =>
  Array.from(event.target.selectedOptions, (option) => option.value);

export function RecipeWorkspace() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Named[]>([]);
  const [tags, setTags] = useState<Named[]>([]);
  const [recipes, setRecipes] = useState<Summary[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [recipeStatus, setRecipeStatus] = useState<"ACTIVE" | "ARCHIVED">(
    "ACTIVE",
  );
  const [name, setName] = useState("");
  const [step, setStep] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState<string[]>([]);
  const [variantFilter, setVariantFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState(
    "Actualiza los catálogos para empezar.",
  );

  const safely = (action: () => Promise<void>) =>
    action().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Ha ocurrido un error",
      ),
    );

  async function refreshCatalogs() {
    const responses = await Promise.all([
      fetch(`${apiUrl}/catalog/ingredients`),
      fetch(`${apiUrl}/catalog/units`),
      fetch(`${apiUrl}/classifications/categories`),
      fetch(`${apiUrl}/classifications/tags`),
    ]);
    if (responses.some((response) => !response.ok))
      throw new Error("No se pudieron cargar los catálogos");
    const [nextIngredients, nextUnits, nextCategories, nextTags] =
      await Promise.all(responses.map((response) => response.json()));
    setIngredients(nextIngredients as Ingredient[]);
    setUnits(nextUnits as Unit[]);
    setCategories(nextCategories as Named[]);
    setTags(nextTags as Named[]);
    setIngredientId((nextIngredients as Ingredient[])[0]?.id ?? "");
    setUnitId((nextUnits as Unit[])[0]?.id ?? "");
    setMessage("Catálogos actualizados.");
  }

  async function addItem(path: string, form: FormData) {
    const response = await fetch(`${apiUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    if (!response.ok)
      throw new Error((await response.json()).message ?? "No se pudo guardar");
    await refreshCatalogs();
  }

  async function changeClassification(
    kind: "categories" | "tags",
    item: Named,
    remove = false,
  ) {
    const name = remove ? undefined : window.prompt("Nuevo nombre", item.name);
    if (!remove && !name) return;
    const response = await fetch(
      `${apiUrl}/classifications/${kind}/${item.id}`,
      {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(name ? { body: JSON.stringify({ name }) } : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        (await response.json()).message ?? "No se pudo modificar",
      );
    await refreshCatalogs();
  }

  async function loadRecipes(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "20",
      status: statusFilter,
    });
    if (categoryFilter.length) params.set("category", categoryFilter.join(","));
    if (tagFilter.length) params.set("tag", tagFilter.join(","));
    if (searchText.trim()) params.set("q", searchText.trim());
    if (ingredientFilter.length)
      params.set("ingredient", ingredientFilter.join(","));
    if (variantFilter.length) params.set("variant", variantFilter.join(","));
    const response = await fetch(`${apiUrl}/recipes?${params}`);
    if (!response.ok) throw new Error("No se pudo cargar la biblioteca");
    const result = (await response.json()) as {
      items: Summary[];
      totalPages: number;
    };
    setRecipes(result.items);
    setTotalPages(Math.max(1, result.totalPages));
    setPage(nextPage);
  }

  async function openRecipe(id: string) {
    const response = await fetch(`${apiUrl}/recipes/${id}`);
    if (!response.ok) throw new Error("No se pudo abrir la receta");
    const recipe = (await response.json()) as {
      id: string;
      name: string;
      status: "ACTIVE" | "ARCHIVED";
      steps: Array<{ text: string }>;
      ingredients: Array<{
        ingredientId: string;
        unitId?: string;
        quantity?: string | null;
      }>;
      categories: Array<{ categoryId: string }>;
      tags: Array<{ tagId: string }>;
    };
    setRecipeId(recipe.id);
    setRecipeStatus(recipe.status);
    setName(recipe.name);
    setStep(recipe.steps[0]?.text ?? "");
    setIngredientId(recipe.ingredients[0]?.ingredientId ?? "");
    setUnitId(recipe.ingredients[0]?.unitId ?? "");
    setQuantity(recipe.ingredients[0]?.quantity ?? "");
    setCategoryIds(recipe.categories.map((item) => item.categoryId));
    setTagIds(recipe.tags.map((item) => item.tagId));
    setMessage("Receta cargada.");
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
      categoryIds,
      tagIds,
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
    const recipe = (await response.json()) as {
      id: string;
      status: "ACTIVE" | "ARCHIVED";
    };
    setRecipeId(recipe.id);
    setRecipeStatus(recipe.status);
    setMessage(
      recipeId ? "Receta actualizada." : "Receta creada y persistida.",
    );
    await loadRecipes(1);
  }

  async function setArchived(archive: boolean) {
    const response = await fetch(
      `${apiUrl}/recipes/${recipeId}/${archive ? "archive" : "restore"}`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("No se pudo cambiar el estado");
    setRecipeStatus(archive ? "ARCHIVED" : "ACTIVE");
    setMessage(archive ? "Receta archivada." : "Receta reactivada.");
    await loadRecipes();
  }

  return (
    <main className="shell">
      <header>
        <span className="eyebrow">Cocina Tuda</span>
        <h1>Biblioteca de recetas</h1>
        <p>Navega, clasifica y mantén tus recetas.</p>
      </header>
      <section className="panel recipe">
        <div className="panel-title">
          <h2>Biblioteca</h2>
          <button onClick={() => void safely(() => loadRecipes(1))}>
            Aplicar filtros
          </button>
        </div>
        <div className="row">
          <label>
            Buscar
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Nombre, descripción o clasificación"
            />
          </label>
          <label>
            Estado
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ACTIVE">Activas</option>
              <option value="ARCHIVED">Archivadas</option>
              <option value="ACTIVE,ARCHIVED">Todas</option>
            </select>
          </label>
          <label>
            Categorías
            <select
              multiple
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(selected(e))}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etiquetas
            <select
              multiple
              value={tagFilter}
              onChange={(e) => setTagFilter(selected(e))}
            >
              {tags.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ingredientes (todos)
            <select
              multiple
              value={ingredientFilter}
              onChange={(e) => setIngredientFilter(selected(e))}
            >
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Variantes (todas)
            <select
              multiple
              value={variantFilter}
              onChange={(e) => setVariantFilter(selected(e))}
            >
              {ingredients.flatMap((ingredient) =>
                ingredient.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {ingredient.name}: {variant.name}
                  </option>
                )),
              )}
            </select>
          </label>
        </div>
        <div className="library-list">
          {recipes.length === 0 && <p>No hay recetas para estos criterios.</p>}
          {recipes.map((recipe) => (
            <button
              className="recipe-card"
              key={recipe.id}
              onClick={() => void safely(() => openRecipe(recipe.id))}
            >
              <strong>{recipe.name}</strong>
              <span>
                {recipe.status === "ARCHIVED" ? "Archivada" : "Activa"}
              </span>
            </button>
          ))}
        </div>
        <div>
          <button
            disabled={page <= 1}
            onClick={() => void safely(() => loadRecipes(page - 1))}
          >
            Anterior
          </button>{" "}
          <span>
            {page} / {totalPages}
          </span>{" "}
          <button
            disabled={page >= totalPages}
            onClick={() => void safely(() => loadRecipes(page + 1))}
          >
            Siguiente
          </button>
        </div>
      </section>
      <section className="panel catalogs">
        <div>
          <h2>Catálogos</h2>
          <button onClick={() => void safely(refreshCatalogs)}>
            Actualizar
          </button>
        </div>
        <form
          action={(form) =>
            void safely(() => addItem("classifications/categories", form))
          }
        >
          <label>
            Nueva categoría
            <input name="name" required />
          </label>
          <button>Agregar</button>
        </form>
        <form
          action={(form) =>
            void safely(() => addItem("classifications/tags", form))
          }
        >
          <label>
            Nueva etiqueta
            <input name="name" required />
          </label>
          <button>Agregar</button>
        </form>
      </section>
      <section className="panel classification-lists">
        <div>
          <h3>Categorías</h3>
          {categories.map((item) => (
            <p key={item.id}>
              {item.name}{" "}
              <button
                onClick={() =>
                  void safely(() => changeClassification("categories", item))
                }
              >
                Renombrar
              </button>{" "}
              <button
                onClick={() =>
                  void safely(() =>
                    changeClassification("categories", item, true),
                  )
                }
              >
                Eliminar
              </button>
            </p>
          ))}
        </div>
        <div>
          <h3>Etiquetas</h3>
          {tags.map((item) => (
            <p key={item.id}>
              {item.name}{" "}
              <button
                onClick={() =>
                  void safely(() => changeClassification("tags", item))
                }
              >
                Renombrar
              </button>{" "}
              <button
                onClick={() =>
                  void safely(() => changeClassification("tags", item, true))
                }
              >
                Eliminar
              </button>
            </p>
          ))}
        </div>
      </section>
      <form
        className="panel recipe"
        onSubmit={(event) => void safely(() => saveRecipe(event))}
      >
        <div className="panel-title">
          <h2>{recipeId ? "Editar receta" : "Crear receta"}</h2>
          {recipeId && (
            <button
              type="button"
              className="quiet"
              onClick={() =>
                void safely(() => setArchived(recipeStatus === "ACTIVE"))
              }
            >
              {recipeStatus === "ACTIVE" ? "Archivar" : "Reactivar"}
            </button>
          )}
        </div>
        <label>
          Nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Primer paso
          <textarea value={step} onChange={(e) => setStep(e.target.value)} />
        </label>
        <div className="row">
          <label>
            Ingrediente
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
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
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label>
            Unidad
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Sin unidad</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.abbreviation}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            Categorías
            <select
              multiple
              value={categoryIds}
              onChange={(e) => setCategoryIds(selected(e))}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etiquetas
            <select
              multiple
              value={tagIds}
              onChange={(e) => setTagIds(selected(e))}
            >
              {tags.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
