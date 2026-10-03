"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { apiFetch, apiUrl } from "../../lib/api";

const storageKey = "cocina-tuda-import-draft-v2";

type Named = { id: string; name: string };
type Variant = Named & { ingredientId: string };
type Ingredient = Named & { variants: Variant[] };
type Unit = Named & { abbreviation: string };
type Resolution = {
  status: "matched" | "ambiguous" | "new" | "unresolved";
  existingId?: string;
  proposedName?: string;
  suggestions: Named[];
};
type ProposedIngredient = {
  ingredient: string | null;
  variant: string | null;
  quantity: string | null;
  unit: string | null;
  optional: boolean;
  observations: string | null;
  ingredientResolution: Resolution;
  variantResolution: Resolution | null;
  unitResolution: Resolution | null;
};
type Proposal = {
  name: string | null;
  description: string | null;
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  steps: string[];
  ingredients: ProposedIngredient[];
  categories: Array<{ name: string; resolution: Resolution }>;
  tags: Array<{ name: string; resolution: Resolution }>;
  issues: string[];
};
type RefDraft = {
  mode: "existing" | "new" | "unresolved" | "discarded";
  existingId: string;
  createName: string;
  createAbbreviation: string;
  proposedName?: string;
  proposalStatus?: Resolution["status"];
  approved?: boolean;
};
type IngredientDraft = {
  ingredient: RefDraft;
  variant: RefDraft;
  quantity: string;
  unit: RefDraft;
  optional: boolean;
  observations: string;
};
type Draft = Omit<
  Proposal,
  | "name"
  | "description"
  | "author"
  | "servings"
  | "difficulty"
  | "notes"
  | "ingredients"
  | "categories"
  | "tags"
> & {
  importId: string;
  name: string;
  description: string;
  author: string;
  servings: string;
  difficulty: string;
  notes: string;
  ingredients: IngredientDraft[];
  categories: RefDraft[];
  tags: RefDraft[];
};

const emptyRef = (): RefDraft => ({
  mode: "unresolved",
  existingId: "",
  createName: "",
  createAbbreviation: "",
});

const discardedRef = (): RefDraft => ({
  ...emptyRef(),
  mode: "discarded",
});

const refFromResolution = (resolution: Resolution | null): RefDraft => {
  if (!resolution) return discardedRef();
  if (resolution?.status === "matched" && resolution.existingId) {
    return {
      ...emptyRef(),
      mode: "existing",
      existingId: resolution.existingId,
      proposedName: resolution.suggestions.find(
        (item) => item.id === resolution.existingId,
      )?.name,
      proposalStatus: resolution.status,
    };
  }
  return {
    ...emptyRef(),
    createName: resolution.proposedName ?? "",
    proposedName: resolution.proposedName,
    proposalStatus: resolution.status,
  };
};

const draftFromProposal = (importId: string, proposal: Proposal): Draft => ({
  ...proposal,
  importId,
  name: proposal.name ?? "",
  description: proposal.description ?? "",
  author: proposal.author ?? "",
  servings: proposal.servings?.toString() ?? "",
  difficulty: proposal.difficulty ?? "",
  notes: proposal.notes ?? "",
  ingredients: proposal.ingredients.map((item) => ({
    ingredient: refFromResolution(item.ingredientResolution),
    variant: refFromResolution(item.variantResolution),
    quantity: item.quantity ?? "",
    unit: refFromResolution(item.unitResolution),
    optional: item.optional,
    observations: item.observations ?? "",
  })),
  categories: proposal.categories.map((item) =>
    refFromResolution(item.resolution),
  ),
  tags: proposal.tags.map((item) => refFromResolution(item.resolution)),
});

export function ImportWorkspace() {
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as Draft;
    } catch {
      window.localStorage.removeItem(storageKey);
      return null;
    }
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Named[]>([]);
  const [tags, setTags] = useState<Named[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadCatalogs();
  }, []);

  useEffect(() => {
    if (draft) window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft]);

  async function loadCatalogs() {
    const responses = await Promise.all([
      apiFetch(`${apiUrl}/catalog/ingredients`),
      apiFetch(`${apiUrl}/catalog/units`),
      apiFetch(`${apiUrl}/classifications/categories`),
      apiFetch(`${apiUrl}/classifications/tags`),
    ]);
    if (responses.some((response) => !response.ok)) {
      setMessage("No se pudieron cargar los catálogos.");
      return;
    }
    const [nextIngredients, nextUnits, nextCategories, nextTags] =
      await Promise.all(responses.map((response) => response.json()));
    setIngredients(nextIngredients as Ingredient[]);
    setUnits(nextUnits as Unit[]);
    setCategories(nextCategories as Named[]);
    setTags(nextTags as Named[]);
  }

  async function propose(event: FormEvent) {
    event.preventDefault();
    if (!consent) {
      setMessage("Debes aceptar el envío al proveedor externo.");
      return;
    }
    setBusy(true);
    try {
      const source = file
        ? {
            kind: "file",
            filename: file.name,
            mimeType: file.type,
            dataBase64: await fileBase64(file),
          }
        : { kind: "text", text: sourceText };
      const response = await apiFetch(`${apiUrl}/imports/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, source }),
      });
      const body = (await response.json()) as {
        importId?: string;
        proposal?: Proposal;
        message?: string;
      };
      if (!response.ok || !body.importId || !body.proposal)
        throw new Error(body.message ?? "No se pudo interpretar la fuente");
      setDraft(draftFromProposal(body.importId, body.proposal));
      setConsent(false);
      setMessage("Propuesta creada. Revísala antes de confirmar.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error de importación",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (
      !draft ||
      hasPendingResolution(draft, ingredients, units, categories, tags)
    )
      return;
    setBusy(true);
    try {
      const response = await apiFetch(`${apiUrl}/imports/confirmations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: draft.importId,
          name: draft.name,
          description: draft.description || null,
          author: draft.author || null,
          servings: draft.servings ? Number(draft.servings) : null,
          difficulty: draft.difficulty || null,
          notes: draft.notes || null,
          steps: draft.steps,
          ingredients: draft.ingredients.map((item) => ({
            ingredient: referencePayload(item.ingredient),
            variant: referencePayload(item.variant),
            ...(item.quantity ? { quantity: item.quantity } : {}),
            unit: referencePayload(item.unit),
            optional: item.optional,
            ...(item.observations ? { observations: item.observations } : {}),
          })),
          categories: draft.categories.map(referencePayload),
          tags: draft.tags.map(referencePayload),
        }),
      });
      const body = (await response.json()) as {
        name?: string;
        message?: string;
      };
      if (!response.ok) {
        await loadCatalogs();
        throw new Error(body.message ?? "No se pudo confirmar la importación");
      }
      window.localStorage.removeItem(storageKey);
      setDraft(null);
      setSourceText("");
      setFile(null);
      setMessage(`Receta «${body.name ?? "importada"}» creada.`);
      await loadCatalogs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al confirmar");
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    window.localStorage.removeItem(storageKey);
    setDraft(null);
    setMessage("Borrador descartado sin guardar datos definitivos.");
  }

  return (
    <div className={`shell workspace ${draft ? "import-review-shell" : ""}`}>
      <header>
        <span className="eyebrow">Cocina Tuda</span>
        <h1>{draft ? "Revisar receta" : "Importar receta"}</h1>
        {!draft && (
          <p>
            Convierte una fuente en una receta revisable antes de guardarla.
          </p>
        )}
      </header>
      <section className="panel recipe">
        {!draft && <h2>Importar receta</h2>}
        {!draft ? (
          <form onSubmit={propose}>
            <label>
              Texto pegado
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                disabled={!!file}
              />
            </label>
            <label>
              O archivo JPEG, PNG, WebP, PDF o DOCX
              <input
                aria-label="Archivo de receta"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              Confirmo que el contenido de esta fuente se enviará a un servicio
              externo de IA para interpretarlo.
            </label>
            <button disabled={busy || (!sourceText.trim() && !file)}>
              {busy ? "Procesando…" : "Crear propuesta"}
            </button>
          </form>
        ) : (
          <ReviewForm
            draft={draft}
            setDraft={setDraft}
            ingredients={ingredients}
            units={units}
            categories={categories}
            tags={tags}
            busy={busy}
            onConfirm={confirm}
            onDiscard={discard}
          />
        )}
        {message &&
          (!draft ||
            message !== "Propuesta creada. Revísala antes de confirmar.") && (
            <p role={draft ? "alert" : "status"}>{message}</p>
          )}
      </section>
    </div>
  );
}

function ReviewForm({
  draft,
  setDraft,
  ingredients,
  units,
  categories,
  tags,
  busy,
  onConfirm,
  onDiscard,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  ingredients: Ingredient[];
  units: Unit[];
  categories: Named[];
  tags: Named[];
  busy: boolean;
  onConfirm: (event: FormEvent) => void;
  onDiscard: () => void;
}) {
  const scalar = (field: keyof Draft, value: string) =>
    setDraft({ ...draft, [field]: value });
  const pending = reviewPending(draft, ingredients, units, categories, tags);
  const [showPending, setShowPending] = useState(false);
  return (
    <form className="import-review" onSubmit={onConfirm}>
      <div className="import-review-heading">
        <h3>Revisión de la propuesta</h3>
        <small>* Obligatorio · La IA propone; tú decides qué guardar.</small>
        <a href="#import-validation" onClick={() => setShowPending(true)}>
          {pending.length
            ? `${pending.length} ${pending.length === 1 ? "acción pendiente" : "acciones pendientes"} · Ver qué falta`
            : "Lista para guardar"}
        </a>
      </div>
      <div className="import-main-data">
        <label className="import-name">
          Nombre *
          <input
            id="import-name"
            aria-label="Nombre"
            aria-invalid={!draft.name.trim()}
            value={draft.name}
            onChange={(e) => scalar("name", e.target.value)}
            required
          />
        </label>
        <label>
          Raciones
          <input
            id="import-servings"
            type="number"
            min="1"
            step="1"
            aria-invalid={
              !!draft.servings &&
              (!Number.isInteger(Number(draft.servings)) ||
                Number(draft.servings) < 1)
            }
            value={draft.servings}
            onChange={(e) => scalar("servings", e.target.value)}
          />
        </label>
        <label>
          Dificultad
          <input
            value={draft.difficulty}
            onChange={(e) => scalar("difficulty", e.target.value)}
          />
        </label>
        <label>
          Autor
          <input
            value={draft.author}
            onChange={(e) => scalar("author", e.target.value)}
          />
        </label>
        <label className="import-description">
          Descripción
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => scalar("description", e.target.value)}
          />
        </label>
      </div>
      <div className="import-review-content">
        <section
          aria-labelledby="import-ingredients-title"
          className="import-ingredients"
        >
          <h3 id="import-ingredients-title">
            Ingredientes <small>({draft.ingredients.length})</small>
          </h3>
          {draft.ingredients.map((item, index) => {
            const base = ingredients.find(
              (candidate) => candidate.id === item.ingredient.existingId,
            );
            const id = `import-ingredient-${index}`;
            return (
              <fieldset key={index} className="import-ingredient">
                <legend>Ingrediente {index + 1}</legend>
                <div className="import-ingredient-fields">
                  <ReferenceEditor
                    id={`${id}-base`}
                    label="Ingrediente base"
                    value={item.ingredient}
                    existing={ingredients}
                    required
                    onChange={(value) =>
                      updateIngredient(draft, setDraft, index, {
                        ingredient: value,
                        variant:
                          item.variant.mode === "existing"
                            ? {
                                ...item.variant,
                                mode: "unresolved",
                                existingId: "",
                                approved: false,
                              }
                            : { ...item.variant, approved: false },
                      })
                    }
                  />
                  <ReferenceEditor
                    id={`${id}-variant`}
                    label="Variante"
                    value={item.variant}
                    existing={base?.variants ?? []}
                    parentName={base?.name ?? item.ingredient.createName}
                    parentPending={isPending(item.ingredient)}
                    allowDiscard
                    onChange={(value) =>
                      updateIngredient(draft, setDraft, index, {
                        variant: value,
                      })
                    }
                  />
                  <label className="import-quantity">
                    Cantidad
                    <input
                      id={`${id}-quantity`}
                      aria-invalid={
                        !!item.quantity && !validQuantity(item.quantity)
                      }
                      value={item.quantity}
                      onChange={(e) =>
                        updateIngredient(draft, setDraft, index, {
                          quantity: e.target.value,
                        })
                      }
                    />
                  </label>
                  <ReferenceEditor
                    id={`${id}-unit`}
                    label="Unidad"
                    value={item.unit}
                    existing={units}
                    unit
                    allowDiscard
                    onChange={(value) =>
                      updateIngredient(draft, setDraft, index, { unit: value })
                    }
                  />
                </div>
                <div className="import-ingredient-extra">
                  <details
                    className="import-ingredient-options"
                    open={item.optional || !!item.observations || undefined}
                  >
                    <summary>Opcional / observaciones</summary>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.optional}
                        onChange={(e) =>
                          updateIngredient(draft, setDraft, index, {
                            optional: e.target.checked,
                          })
                        }
                      />
                      Opcional
                    </label>
                    <label className="import-observations">
                      Observaciones
                      <input
                        value={item.observations}
                        onChange={(e) =>
                          updateIngredient(draft, setDraft, index, {
                            observations: e.target.value,
                          })
                        }
                      />
                    </label>
                  </details>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        ingredients: draft.ingredients.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Quitar ingrediente
                  </button>
                </div>
              </fieldset>
            );
          })}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                ingredients: [
                  ...draft.ingredients,
                  {
                    ingredient: emptyRef(),
                    variant: emptyRef(),
                    unit: emptyRef(),
                    quantity: "",
                    optional: false,
                    observations: "",
                  },
                ],
              })
            }
          >
            Añadir ingrediente
          </button>
        </section>
        <section aria-labelledby="import-steps-title" className="import-steps">
          <h3 id="import-steps-title">
            Pasos <small>({draft.steps.length})</small>
          </h3>
          {draft.steps.map((step, index) => (
            <div className="import-step" key={index}>
              <label>
                Paso {index + 1}
                <textarea
                  rows={3}
                  value={step}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      steps: draft.steps.map((item, i) =>
                        i === index ? e.target.value : item,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    steps: draft.steps.filter((_, i) => i !== index),
                  })
                }
              >
                Quitar paso
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => setDraft({ ...draft, steps: [...draft.steps, ""] })}
          >
            Añadir paso
          </button>
        </section>
      </div>
      <div className="import-review-secondary">
        <ReferenceList
          label="Categorías"
          values={draft.categories}
          existing={categories}
          onChange={(values) => setDraft({ ...draft, categories: values })}
        />
        <ReferenceList
          label="Etiquetas"
          values={draft.tags}
          existing={tags}
          onChange={(values) => setDraft({ ...draft, tags: values })}
        />
        <label>
          Notas
          <textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => scalar("notes", e.target.value)}
          />
        </label>
      </div>
      <div id="import-validation" className="import-validation">
        <div
          role="status"
          aria-live="polite"
          className="import-validation-status"
        >
          <strong>
            {pending.length
              ? `${pending.length} ${pending.length === 1 ? "acción pendiente" : "acciones pendientes"} para guardar`
              : "Lista para guardar"}
          </strong>
        </div>
        {pending.length > 0 && (
          <details
            open={showPending}
            onToggle={(event) => setShowPending(event.currentTarget.open)}
            className="import-pending"
          >
            <summary>Qué falta · Ir al control</summary>
            <ul>
              {pending.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const control = document.getElementById(item.id);
                      control?.scrollIntoView({ block: "center" });
                      control?.focus();
                    }}
                  >
                    {item.message}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="import-confirm-actions">
          <button disabled={busy || pending.length > 0}>
            {busy ? "Guardando…" : "Confirmar y crear receta"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onDiscard}
          >
            Descartar
          </button>
        </div>
      </div>
    </form>
  );
}

function ReferenceList({
  label,
  values,
  existing,
  onChange,
}: {
  label: string;
  values: RefDraft[];
  existing: Named[];
  onChange: (values: RefDraft[]) => void;
}) {
  return (
    <div>
      <h3>{label}</h3>
      {values.map((value, index) => (
        <ReferenceEditor
          key={index}
          id={`import-${label.toLocaleLowerCase("es")}-${index}`}
          label={`${label} ${index + 1}`}
          value={value}
          existing={existing}
          onChange={(next) =>
            onChange(values.map((item, i) => (i === index ? next : item)))
          }
          allowDiscard
        />
      ))}
      <button type="button" onClick={() => onChange([...values, emptyRef()])}>
        Añadir
      </button>
    </div>
  );
}

function ReferenceEditor({
  id,
  label,
  value,
  existing,
  onChange,
  required = false,
  unit = false,
  allowDiscard = false,
  parentName,
  parentPending = false,
}: {
  id?: string;
  label: string;
  value: RefDraft;
  existing: Named[];
  onChange: (value: RefDraft) => void;
  required?: boolean;
  unit?: boolean;
  allowDiscard?: boolean;
  parentName?: string;
  parentPending?: boolean;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [editing, setEditing] = useState(false);
  const selected =
    value.mode === "existing" ? `existing:${value.existingId}` : value.mode;
  const collision = findCollision(value, existing);
  const issue = referenceIssue(value, existing, required, unit);
  const approved = value.mode === "new" && value.approved && !collision;
  const expanded = value.mode === "new" && (!approved || editing);
  const status = collision
    ? "Conflicto"
    : value.mode === "existing"
      ? "Existente"
      : approved
        ? "Nuevo · Aprobado"
        : value.mode === "discarded"
          ? "Descartado"
          : value.proposalStatus === "new" || value.mode === "new"
            ? "Nuevo · Pendiente"
            : "Pendiente";
  return (
    <div className={`import-reference ${issue ? "is-pending" : ""}`}>
      <div className="import-reference-caption">
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        <small className="import-state">{status}</small>
      </div>
      <select
        id={controlId}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!issue}
        aria-describedby={issue ? `${controlId}-help` : undefined}
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          setEditing(false);
          if (next.startsWith("existing:"))
            onChange({
              ...value,
              mode: "existing",
              existingId: next.slice(9),
              approved: false,
            });
          else
            onChange({
              ...value,
              mode: next as RefDraft["mode"],
              existingId: "",
              approved: false,
            });
        }}
      >
        <option value="unresolved">
          {value.proposedName
            ? `IA: ${value.proposedName}`
            : required
              ? "Elegir ingrediente…"
              : "Resolver…"}
        </option>
        {existing.map((item) => (
          <option key={item.id} value={`existing:${item.id}`}>
            {item.name}
          </option>
        ))}
        <option value="new">
          {approved
            ? `Nuevo: ${value.createName}${unit ? ` (${value.createAbbreviation})` : ""}`
            : "Crear nuevo…"}
        </option>
        {allowDiscard && <option value="discarded">Descartar dato</option>}
      </select>
      {parentName && value.mode !== "discarded" && (
        <small>Variante de: {parentName}</small>
      )}
      {value.mode === "unresolved" && value.createName && (
        <button
          type="button"
          className="secondary"
          onClick={() => onChange({ ...value, mode: "new", approved: false })}
        >
          Revisar creación de {value.createName}
        </button>
      )}
      {expanded && (
        <div className="import-new-fields">
          <label>
            Nombre nuevo *
            <input
              aria-label={`${label} nuevo nombre`}
              value={value.createName}
              aria-invalid={!value.createName.trim() || !!collision}
              onChange={(e) =>
                onChange({
                  ...value,
                  createName: e.target.value,
                  approved: false,
                })
              }
              required
            />
          </label>
          {unit && (
            <label>
              Abreviatura *
              <input
                aria-label={`${label} abreviatura`}
                value={value.createAbbreviation}
                aria-invalid={!value.createAbbreviation.trim()}
                onChange={(e) =>
                  onChange({
                    ...value,
                    createAbbreviation: e.target.value,
                    approved: false,
                  })
                }
                required
              />
            </label>
          )}
          <button
            type="button"
            disabled={
              !!collision ||
              parentPending ||
              !value.createName.trim() ||
              (unit && !value.createAbbreviation.trim()) ||
              value.approved === true
            }
            onClick={() => {
              onChange({ ...value, approved: true });
              setEditing(false);
            }}
          >
            Aprobar creación de {label.toLocaleLowerCase("es")}
          </button>
          {parentPending && (
            <small>Aprueba o elige primero el ingrediente base.</small>
          )}
        </div>
      )}
      {approved && !expanded && (
        <button
          type="button"
          className="secondary"
          onClick={() => setEditing(true)}
        >
          Modificar {label.toLocaleLowerCase("es")}
        </button>
      )}
      {issue && (
        <small
          id={`${controlId}-help`}
          className={collision ? "import-reference-help" : "sr-only"}
        >
          {collision
            ? `Ya existe «${collision.name}». Selecciónalo en ${label}.`
            : issue}
        </small>
      )}
    </div>
  );
}

function updateIngredient(
  draft: Draft,
  setDraft: (draft: Draft) => void,
  index: number,
  update: Partial<IngredientDraft>,
) {
  setDraft({
    ...draft,
    ingredients: draft.ingredients.map((item, i) =>
      i === index ? { ...item, ...update } : item,
    ),
  });
}

function referencePayload(reference: RefDraft) {
  if (reference.mode === "discarded") return { discarded: true };
  return reference.mode === "existing"
    ? { existingId: reference.existingId }
    : reference.mode === "new" && reference.approved
      ? {
          createName: reference.createName,
          ...(reference.createAbbreviation
            ? { createAbbreviation: reference.createAbbreviation }
            : {}),
        }
      : {};
}

function isPending(reference: RefDraft, unit = false) {
  return (
    reference.mode === "unresolved" ||
    (reference.mode === "new" &&
      (!reference.approved ||
        !reference.createName.trim() ||
        (unit && !reference.createAbbreviation.trim())))
  );
}

function normalizeName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
}

function findCollision(reference: RefDraft, existing: Named[]) {
  return reference.mode === "new"
    ? existing.find(
        (item) =>
          normalizeName(item.name) === normalizeName(reference.createName),
      )
    : undefined;
}

function referenceIssue(
  reference: RefDraft,
  existing: Named[],
  required = false,
  unit = false,
): string | null {
  const collision = findCollision(reference, existing);
  if (collision) return `Conflicto: elige «${collision.name}» del catálogo`;
  if (reference.mode === "discarded")
    return required ? "Elige un ingrediente base obligatorio" : null;
  if (reference.mode === "unresolved")
    return `Resuelve «${reference.proposedName || reference.createName || "sin seleccionar"}»${required ? "" : " o descártalo"}`;
  if (reference.mode === "new") {
    if (!reference.createName.trim())
      return "Completa el nombre nuevo obligatorio";
    if (unit && !reference.createAbbreviation.trim())
      return "Completa la abreviatura obligatoria";
    if (!reference.approved)
      return `Aprueba la creación de «${reference.createName}»`;
  }
  return null;
}

function validQuantity(value: string) {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value);
}

function reviewPending(
  draft: Draft,
  ingredients: Ingredient[],
  units: Unit[],
  categories: Named[],
  tags: Named[],
) {
  const pending: Array<{ id: string; message: string }> = [];
  if (!draft.name.trim())
    pending.push({ id: "import-name", message: "Nombre obligatorio." });
  if (
    draft.servings &&
    (!Number.isInteger(Number(draft.servings)) || Number(draft.servings) < 1)
  )
    pending.push({
      id: "import-servings",
      message:
        "Raciones: introduce un entero mayor que cero o deja el campo vacío.",
    });
  const addReference = (
    reference: RefDraft,
    existing: Named[],
    id: string,
    label: string,
    required = false,
    unit = false,
  ) => {
    const issue = referenceIssue(reference, existing, required, unit);
    if (issue) pending.push({ id, message: `${label}: ${issue}.` });
  };
  draft.ingredients.forEach((item, index) => {
    const id = `import-ingredient-${index}`;
    addReference(
      item.ingredient,
      ingredients,
      `${id}-base`,
      `Ingrediente ${index + 1}`,
      true,
    );
    addReference(
      item.variant,
      ingredients.find((base) => base.id === item.ingredient.existingId)
        ?.variants ?? [],
      `${id}-variant`,
      `Variante ${index + 1}`,
    );
    addReference(
      item.unit,
      units,
      `${id}-unit`,
      `Unidad ${index + 1}`,
      false,
      true,
    );
    if (item.quantity && !validQuantity(item.quantity))
      pending.push({
        id: `${id}-quantity`,
        message: `Cantidad ${index + 1}: usa un número positivo o cero, con punto y hasta tres decimales, o deja el campo vacío.`,
      });
  });
  for (const [label, references, existing] of [
    ["Categorías", draft.categories, categories],
    ["Etiquetas", draft.tags, tags],
  ] as const) {
    const used = new Set<string>();
    references.forEach((reference, index) => {
      const id = `import-${label.toLocaleLowerCase("es")}-${index}`;
      addReference(reference, existing, id, `${label} ${index + 1}`);
      if (reference.mode === "existing") {
        if (used.has(reference.existingId))
          pending.push({
            id,
            message: `${label} ${index + 1}: clasificación repetida; elige otra o descarta esta.`,
          });
        used.add(reference.existingId);
      }
    });
  }
  return pending;
}

function hasPendingResolution(
  draft: Draft,
  ingredients: Ingredient[],
  units: Unit[],
  categories: Named[],
  tags: Named[],
) {
  return reviewPending(draft, ingredients, units, categories, tags).length > 0;
}

async function fileBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
