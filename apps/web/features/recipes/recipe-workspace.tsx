"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, apiUrl, responseError } from "../../lib/api";
import { RecipeModal } from "./recipe-modal";
import { MultiSelect } from "./compact-multi-select";
import { CatalogManager } from "./catalog-manager";
import {
  MamboEditor,
  MamboSummary,
  mamboPayload,
  stepDraft,
  validMambo,
  type StepDraft,
  type RecipeStep,
} from "./mambo";

type Named = { id: string; name: string };
type Variant = Named & { ingredientId: string };
type Ingredient = Named & { variants: Variant[] };
type Unit = Named & { abbreviation: string };

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
type RecipeDetail = Summary & {
  description: string | null;
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  steps: RecipeStep[];
  ingredients: Array<{
    ingredientId: string;
    variantId: string | null;
    unitId: string | null;
    quantity: string | null;
    optional: boolean;
    observations: string | null;
    ingredient?: Named;
    variant?: Named | null;
    unit?: Unit | null;
  }>;
};

const emptyIngredient = (): IngredientDraft => ({
  ingredientId: "",
  variantId: "",
  quantity: "",
  unitId: "",
  optional: false,
  observations: "",
});

export function RecipeWorkspace({
  mode = "library",
  onLibrary,
}: {
  mode?: "library" | "create";
  onLibrary?(): void;
}) {
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!editing) editButton.current?.focus();
  }, [editing]);
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
  const latestRecipeRequest = useRef(0);
  const [message, setMessage] = useState("Cargando tu biblioteca…");

  const safely = (action: () => Promise<void>) =>
    action().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Ha ocurrido un error",
      ),
    );

  async function refreshCatalogs() {
    const responses = await Promise.all([
      apiFetch(`${apiUrl}/catalog/ingredients`),
      apiFetch(`${apiUrl}/catalog/units`),
      apiFetch(`${apiUrl}/classifications/categories`),
      apiFetch(`${apiUrl}/classifications/tags`),
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

  async function loadRecipes(nextPage = page, clear = false) {
    const request = ++latestRecipeRequest.current;
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20",
        status: clear ? "ACTIVE" : statusFilter,
      });
      if (!clear) {
        if (categoryFilter.length)
          params.set("category", categoryFilter.join(","));
        if (tagFilter.length) params.set("tag", tagFilter.join(","));
        if (searchText.trim()) params.set("q", searchText.trim());
        if (ingredientFilter.length)
          params.set("ingredient", ingredientFilter.join(","));
        if (variantFilter.length)
          params.set("variant", variantFilter.join(","));
      }
      const response = await apiFetch(`${apiUrl}/recipes?${params}`);
      if (request !== latestRecipeRequest.current) return;
      if (!response.ok) throw new Error("No se pudo cargar la biblioteca");
      const result = (await response.json()) as {
        items: Summary[];
        totalPages: number;
      };
      if (request !== latestRecipeRequest.current) return;
      setRecipes(result.items);
      setTotalPages(Math.max(1, result.totalPages));
      setPage(nextPage);
    } catch (error) {
      if (request === latestRecipeRequest.current) throw error;
    }
  }

  async function openRecipe(id: string) {
    const response = await apiFetch(`${apiUrl}/recipes/${id}`);
    if (!response.ok) throw new Error("No se pudo abrir la receta");
    const recipe = (await response.json()) as RecipeDetail;
    setDetail(recipe);
    setEditing(false);
    fillEditor(recipe);
    setMessage("Receta cargada.");
  }

  function fillEditor(recipe: RecipeDetail) {
    setRecipeId(recipe.id);
    setRecipeStatus(recipe.status);
    setName(recipe.name);
    setDescription(recipe.description ?? "");
    setAuthor(recipe.author ?? "");
    setServings(recipe.servings?.toString() ?? "");
    setDifficulty(recipe.difficulty ?? "");
    setNotes(recipe.notes ?? "");
    setSteps(recipe.steps.map(stepDraft));
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
  }

  function closeRecipe() {
    setDetail(null);
    setEditing(false);
    setRecipeId("");
    setName("");
    setDescription("");
    setAuthor("");
    setServings("");
    setDifficulty("");
    setNotes("");
    setSteps([]);
    setRecipeIngredients([]);
    setCategoryIds([]);
    setTagIds([]);
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    if (steps.some((item) => !validMambo(item.mambo)))
      throw new Error("Revisa los valores de Mambo antes de guardar.");
    const payload = {
      name,
      description: description || null,
      author: author || null,
      servings: servings ? Number(servings) : null,
      difficulty: difficulty || null,
      notes: notes || null,
      steps: steps.map((item, position) => ({
        position,
        text: item.text,
        ...(item.mambo ? { mambo: mamboPayload(item.mambo) } : {}),
      })),
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
    const response = await apiFetch(
      `${apiUrl}/recipes${recipeId ? `/${recipeId}` : ""}`,
      {
        method: recipeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok)
      throw new Error(await responseError(response, "No se pudo guardar"));
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
    await openRecipe(recipe.id);
    setMessage("Receta guardada.");
  }

  async function setArchived(archive: boolean) {
    const response = await apiFetch(
      `${apiUrl}/recipes/${recipeId}/${archive ? "archive" : "restore"}`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("No se pudo cambiar el estado");
    setRecipeStatus(archive ? "ARCHIVED" : "ACTIVE");
    if (detail)
      setDetail({ ...detail, status: archive ? "ARCHIVED" : "ACTIVE" });
    setMessage(archive ? "Receta archivada." : "Receta reactivada.");
    await loadRecipes();
  }

  useEffect(() => {
    void safely(async () => {
      await Promise.all([refreshCatalogs(), loadRecipes(1)]);
      setMessage("Biblioteca lista.");
    });
    // La carga inicial debe ejecutarse una sola vez al abrir esta sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStep = (index: number, text: string) =>
    setSteps((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, text } : item,
      ),
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
    <div className="shell workspace library-workspace">
      <header>
        <h1>{mode === "library" ? "Biblioteca de recetas" : "Crear receta"}</h1>
      </header>

      {mode === "library" && (
        <section className="panel recipe">
          <div className="panel-title library-filter-actions">
            <button onClick={() => void safely(() => loadRecipes(1))}>
              Aplicar filtros
            </button>
            <button
              className="quiet"
              onClick={() => {
                setSearchText("");
                setCategoryFilter([]);
                setTagFilter([]);
                setIngredientFilter([]);
                setVariantFilter([]);
                setStatusFilter("ACTIVE");
                void safely(() => loadRecipes(1, true));
              }}
            >
              Borrar filtros
            </button>
          </div>
          <div className="library-filter-grid">
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
            {recipes.length === 0 && (
              <p>No hay recetas para estos criterios.</p>
            )}
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
      )}

      {!detail && mode === "library" && (
        <CatalogManager
          ingredients={ingredients}
          units={units}
          categories={categories}
          tags={tags}
          refresh={refreshCatalogs}
        />
      )}

      <RecipeModal
        active={!!detail}
        title={detail?.name ?? "Receta"}
        onClose={closeRecipe}
      >
        {detail && !editing && (
          <>
            <div className="recipe-read-header">
              <h2>{detail.name}</h2>
              {detail.description && <p>{detail.description}</p>}
              <div className="recipe-meta">
                {detail.author && <span>Por {detail.author}</span>}
                {detail.servings && <span>{detail.servings} raciones</span>}
                {detail.difficulty && <span>{detail.difficulty}</span>}
                {detail.status === "ARCHIVED" && <span>Archivada</span>}
                {[...detail.categories, ...detail.tags].map((item) => (
                  <span key={item.id}>{item.name}</span>
                ))}
              </div>
            </div>
            <div className="recipe-read-columns">
              <section>
                <h3>Ingredientes</h3>
                <ul className="recipe-ingredients">
                  {detail.ingredients.map((item, index) => {
                    const base =
                      item.ingredient ??
                      ingredients.find(
                        (value) => value.id === item.ingredientId,
                      );
                    const variant =
                      item.variant ??
                      ingredients
                        .find((value) => value.id === item.ingredientId)
                        ?.variants.find((value) => value.id === item.variantId);
                    const unit =
                      item.unit ??
                      units.find((value) => value.id === item.unitId);
                    return (
                      <li key={index}>
                        <strong>{base?.name ?? "Ingrediente"}</strong>
                        {variant && ` · ${variant.name}`}
                        <span>
                          {[item.quantity, unit?.abbreviation]
                            .filter(Boolean)
                            .join(" ")}
                          {item.optional && " · Opcional"}
                        </span>
                        {item.observations && (
                          <small>{item.observations}</small>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section>
                <h3>Pasos</h3>
                <ol className="recipe-steps">
                  {detail.steps.map((step, index) => (
                    <li key={index}>
                      {step.text}
                      <MamboSummary value={step.mambo} />
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            {detail.notes && (
              <aside className="recipe-notes">
                <h3>Notas</h3>
                <p>{detail.notes}</p>
              </aside>
            )}
            <div className="recipe-actions">
              {mode === "create" && onLibrary && (
                <button onClick={onLibrary}>Ver en biblioteca</button>
              )}
              <button
                ref={editButton}
                className="primary"
                onClick={() => setEditing(true)}
              >
                Editar
              </button>
              <button
                className="quiet"
                onClick={() =>
                  void safely(() => setArchived(detail.status === "ACTIVE"))
                }
              >
                {detail.status === "ACTIVE" ? "Archivar" : "Reactivar"}
              </button>
            </div>
          </>
        )}
        {((mode === "create" && !detail) || editing) && (
          <>
            <CatalogManager
              ingredients={ingredients}
              units={units}
              categories={categories}
              tags={tags}
              refresh={refreshCatalogs}
            />
            <form
              className="panel recipe recipe-editor"
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
                  autoFocus={!!detail}
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
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
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
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              <section>
                <div className="panel-title">
                  <h3>Pasos</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSteps((current) => [...current, { text: "" }])
                    }
                  >
                    Añadir paso
                  </button>
                </div>
                {steps.map((item, index) => (
                  <div className="recipe-step-editor" key={index}>
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
                    <MamboEditor
                      step={index + 1}
                      value={item.mambo}
                      onChange={(mambo) =>
                        setSteps((current) =>
                          current.map((step, i) =>
                            i === index ? { ...step, mambo } : step,
                          ),
                        )
                      }
                    />
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
                    <div className="recipe-ingredient-row" key={index}>
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
                            updateRecipeIngredient(index, {
                              unitId: e.target.value,
                            })
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
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
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
              {detail && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    fillEditor(detail);
                    setEditing(false);
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </form>
          </>
        )}
        {detail && (
          <p className="status" role="status">
            {message}
          </p>
        )}
      </RecipeModal>
      {!detail && (
        <p className="status" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
