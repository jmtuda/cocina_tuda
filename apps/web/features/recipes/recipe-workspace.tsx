"use client";

import { FormEvent, useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
type Named = { id: string; name: string };
type Variant = Named & { ingredientId: string };
type Ingredient = Named & { variants: Variant[] };
type Unit = Named & { abbreviation: string };
type StepDraft = { text: string };
type IngredientDraft = {
  ingredientId: string;
  variantId: string;
  quantity: string;
  unitId: string;
  optional: boolean;
  observations: string;
};
type Summary = Named & {
  status: "ACTIVE" | "ARCHIVED";
  categories: Named[];
  tags: Named[];
};

const emptyIngredient = (): IngredientDraft => ({
  ingredientId: "",
  variantId: "",
  quantity: "",
  unitId: "",
  optional: false,
  observations: "",
});
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
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [servings, setServings] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<IngredientDraft[]>(
    [],
  );
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
    setMessage("Catálogos actualizados.");
  }

  async function addItem(path: string, payload: object) {
    const response = await fetch(`${apiUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok)
      throw new Error((await response.json()).message ?? "No se pudo guardar");
    await refreshCatalogs();
  }

  async function addFormItem(path: string, form: FormData) {
    await addItem(path, Object.fromEntries(form.entries()));
  }

  async function changeClassification(
    kind: "categories" | "tags",
    item: Named,
    remove = false,
  ) {
    const nextName = remove
      ? undefined
      : window.prompt("Nuevo nombre", item.name);
    if (!remove && !nextName) return;
    const response = await fetch(
      `${apiUrl}/classifications/${kind}/${item.id}`,
      {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(nextName ? { body: JSON.stringify({ name: nextName }) } : {}),
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
      description: string | null;
      author: string | null;
      servings: number | null;
      difficulty: string | null;
      notes: string | null;
      status: "ACTIVE" | "ARCHIVED";
      steps: Array<{ text: string }>;
      ingredients: Array<{
        ingredientId: string;
        variantId: string | null;
        unitId: string | null;
        quantity: string | null;
        optional: boolean;
        observations: string | null;
      }>;
      categories: Named[];
      tags: Named[];
    };
    setRecipeId(recipe.id);
    setRecipeStatus(recipe.status);
    setName(recipe.name);
    setDescription(recipe.description ?? "");
    setAuthor(recipe.author ?? "");
    setServings(recipe.servings?.toString() ?? "");
    setDifficulty(recipe.difficulty ?? "");
    setNotes(recipe.notes ?? "");
    setSteps(recipe.steps.map(({ text }) => ({ text })));
    setRecipeIngredients(
      recipe.ingredients.map((item) => ({
        ingredientId: item.ingredientId,
        variantId: item.variantId ?? "",
        quantity: item.quantity ?? "",
        unitId: item.unitId ?? "",
        optional: item.optional,
        observations: item.observations ?? "",
      })),
    );
    setCategoryIds(recipe.categories.map((item) => item.id));
    setTagIds(recipe.tags.map((item) => item.id));
    setMessage("Receta cargada.");
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name,
      description: description || null,
      author: author || null,
      servings: servings ? Number(servings) : null,
      difficulty: difficulty || null,
      notes: notes || null,
      steps: steps.map((item, position) => ({ position, text: item.text })),
      ingredients: recipeIngredients.map((item, position) => ({
        position,
        ingredientId: item.ingredientId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        ...(item.quantity ? { quantity: item.quantity } : {}),
        ...(item.unitId ? { unitId: item.unitId } : {}),
        optional: item.optional,
        ...(item.observations ? { observations: item.observations } : {}),
      })),
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

  const updateStep = (index: number, text: string) =>
    setSteps((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { text } : item)),
    );
  const updateRecipeIngredient = (
    index: number,
    update: Partial<IngredientDraft>,
  ) =>
    setRecipeIngredients((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...update } : item,
      ),
    );

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
          <MultiSelect
            label="Categorías"
            value={categoryFilter}
            items={categories}
            onChange={setCategoryFilter}
          />
          <MultiSelect
            label="Etiquetas"
            value={tagFilter}
            items={tags}
            onChange={setTagFilter}
          />
          <MultiSelect
            label="Ingredientes (todos)"
            value={ingredientFilter}
            items={ingredients}
            onChange={setIngredientFilter}
          />
          <MultiSelect
            label="Variantes (todas)"
            value={variantFilter}
            items={ingredients.flatMap((ingredient) =>
              ingredient.variants.map((variant) => ({
                ...variant,
                name: `${ingredient.name}: ${variant.name}`,
              })),
            )}
            onChange={setVariantFilter}
          />
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
            void safely(() => addFormItem("catalog/ingredients", form))
          }
        >
          <label>
            Nuevo ingrediente
            <input name="name" required />
          </label>
          <button>Agregar</button>
        </form>
        <form
          action={(form) =>
            void safely(() => addFormItem("catalog/units", form))
          }
        >
          <label>
            Nueva unidad
            <input name="name" required />
          </label>
          <label>
            Abreviatura
            <input name="abbreviation" required />
          </label>
          <button>Agregar</button>
        </form>
        <form
          action={(form) => {
            const ingredientId = String(form.get("ingredientId") ?? "");
            form.delete("ingredientId");
            return void safely(() =>
              addFormItem(`catalog/ingredients/${ingredientId}/variants`, form),
            );
          }}
        >
          <label>
            Ingrediente
            <select name="ingredientId" required>
              <option value="">Selecciona</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nueva variante
            <input name="name" required />
          </label>
          <button>Agregar</button>
        </form>
        <form
          action={(form) =>
            void safely(() => addFormItem("classifications/categories", form))
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
            void safely(() => addFormItem("classifications/tags", form))
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
          <h3>Ingredientes</h3>
          {ingredients.map((item) => (
            <p key={item.id}>
              {item.name}
              {item.variants.length
                ? `: ${item.variants.map((variant) => variant.name).join(", ")}`
                : ""}
            </p>
          ))}
        </div>
        <div>
          <h3>Unidades</h3>
          {units.map((item) => (
            <p key={item.id}>
              {item.name} ({item.abbreviation})
            </p>
          ))}
        </div>
        <ClassificationList
          title="Categorías"
          kind="categories"
          items={categories}
          safely={safely}
          change={changeClassification}
        />
        <ClassificationList
          title="Etiquetas"
          kind="tags"
          items={tags}
          safely={safely}
          change={changeClassification}
        />
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
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="row">
          <label>
            Autor
            <input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
          <label>
            Raciones
            <input
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </label>
          <label>
            Dificultad
            <input
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            />
          </label>
        </div>
        <label>
          Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <section>
          <div className="panel-title">
            <h3>Pasos</h3>
            <button
              type="button"
              onClick={() => setSteps((current) => [...current, { text: "" }])}
            >
              Añadir paso
            </button>
          </div>
          {steps.map((item, index) => (
            <div className="row" key={index}>
              <label>
                Paso {index + 1}
                <textarea
                  value={item.text}
                  onChange={(e) => updateStep(index, e.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setSteps((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Eliminar paso
              </button>
            </div>
          ))}
        </section>

        <section>
          <div className="panel-title">
            <h3>Ingredientes de receta</h3>
            <button
              type="button"
              onClick={() =>
                setRecipeIngredients((current) => [
                  ...current,
                  emptyIngredient(),
                ])
              }
            >
              Añadir ingrediente
            </button>
          </div>
          {recipeIngredients.map((item, index) => {
            const variants =
              ingredients.find(
                (ingredient) => ingredient.id === item.ingredientId,
              )?.variants ?? [];
            return (
              <div className="row" key={index}>
                <label>
                  Ingrediente {index + 1}
                  <select
                    value={item.ingredientId}
                    onChange={(e) =>
                      updateRecipeIngredient(index, {
                        ingredientId: e.target.value,
                        variantId: "",
                      })
                    }
                    required
                  >
                    <option value="">Selecciona</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Variante
                  <select
                    value={item.variantId}
                    onChange={(e) =>
                      updateRecipeIngredient(index, {
                        variantId: e.target.value,
                      })
                    }
                  >
                    <option value="">Sin variante</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    value={item.quantity}
                    onChange={(e) =>
                      updateRecipeIngredient(index, {
                        quantity: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Unidad
                  <select
                    value={item.unitId}
                    onChange={(e) =>
                      updateRecipeIngredient(index, { unitId: e.target.value })
                    }
                  >
                    <option value="">Sin unidad</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.abbreviation}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Opcional
                  <input
                    type="checkbox"
                    checked={item.optional}
                    onChange={(e) =>
                      updateRecipeIngredient(index, {
                        optional: e.target.checked,
                      })
                    }
                  />
                </label>
                <label>
                  Observaciones
                  <input
                    value={item.observations}
                    onChange={(e) =>
                      updateRecipeIngredient(index, {
                        observations: e.target.value,
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setRecipeIngredients((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Eliminar ingrediente
                </button>
              </div>
            );
          })}
        </section>

        <div className="row">
          <MultiSelect
            label="Categorías de receta"
            value={categoryIds}
            items={categories}
            onChange={setCategoryIds}
          />
          <MultiSelect
            label="Etiquetas de receta"
            value={tagIds}
            items={tags}
            onChange={setTagIds}
          />
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

function MultiSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string[];
  items: Named[];
  onChange(value: string[]): void;
}) {
  return (
    <label>
      {label}
      <select
        multiple
        value={value}
        onChange={(event) => onChange(selected(event))}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClassificationList({
  title,
  kind,
  items,
  safely,
  change,
}: {
  title: string;
  kind: "categories" | "tags";
  items: Named[];
  safely(action: () => Promise<void>): void;
  change(
    kind: "categories" | "tags",
    item: Named,
    remove?: boolean,
  ): Promise<void>;
}) {
  return (
    <div>
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item.id}>
          {item.name}{" "}
          <button onClick={() => void safely(() => change(kind, item))}>
            Renombrar
          </button>{" "}
          <button onClick={() => void safely(() => change(kind, item, true))}>
            Eliminar
          </button>
        </p>
      ))}
    </div>
  );
}
