"use client";

import { FormEvent, useEffect, useState } from "react";
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
    <div className="shell workspace">
      <header>
        <span className="eyebrow">Cocina Tuda</span>
        <h1>Importar receta</h1>
        <p>Convierte una fuente en una receta revisable antes de guardarla.</p>
      </header>
      <section className="panel recipe">
        <h2>Importar receta</h2>
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
        {message && <p role="status">{message}</p>}
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
  return (
    <form onSubmit={onConfirm}>
      <h3>Revisión de la propuesta</h3>
      {draft.issues.length > 0 && (
        <ul>
          {draft.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <label>
        Nombre
        <input
          value={draft.name}
          onChange={(e) => scalar("name", e.target.value)}
          required
        />
      </label>
      <label>
        Descripción
        <textarea
          value={draft.description}
          onChange={(e) => scalar("description", e.target.value)}
        />
      </label>
      <label>
        Autor
        <input
          value={draft.author}
          onChange={(e) => scalar("author", e.target.value)}
        />
      </label>
      <label>
        Raciones
        <input
          type="number"
          min="1"
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
        Notas
        <textarea
          value={draft.notes}
          onChange={(e) => scalar("notes", e.target.value)}
        />
      </label>

      <h3>Pasos</h3>
      {draft.steps.map((step, index) => (
        <div key={index}>
          <label>
            Paso {index + 1}
            <textarea
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
        onClick={() => setDraft({ ...draft, steps: [...draft.steps, ""] })}
      >
        Añadir paso
      </button>

      <h3>Ingredientes</h3>
      {draft.ingredients.map((item, index) => {
        const base = ingredients.find(
          (candidate) => candidate.id === item.ingredient.existingId,
        );
        return (
          <fieldset key={index}>
            <legend>Ingrediente {index + 1}</legend>
            <ReferenceEditor
              label="Ingrediente base"
              value={item.ingredient}
              existing={ingredients}
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
              required
            />
            <ReferenceEditor
              label="Variante"
              value={item.variant}
              existing={base?.variants ?? []}
              parentName={base?.name ?? item.ingredient.createName}
              parentPending={isPending(item.ingredient)}
              onChange={(value) =>
                updateIngredient(draft, setDraft, index, { variant: value })
              }
              allowDiscard
            />
            <label>
              Cantidad
              <input
                value={item.quantity}
                onChange={(e) =>
                  updateIngredient(draft, setDraft, index, {
                    quantity: e.target.value,
                  })
                }
              />
            </label>
            <ReferenceEditor
              label="Unidad"
              value={item.unit}
              existing={units}
              unit
              allowDiscard
              onChange={(value) =>
                updateIngredient(draft, setDraft, index, { unit: value })
              }
            />
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
            <label>
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
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  ingredients: draft.ingredients.filter((_, i) => i !== index),
                })
              }
            >
              Quitar ingrediente
            </button>
          </fieldset>
        );
      })}
      <button
        type="button"
        onClick={() =>
          setDraft({
            ...draft,
            ingredients: [
              ...draft.ingredients,
              {
                ingredient: emptyRef(),
                variant: emptyRef(),
                quantity: "",
                unit: emptyRef(),
                optional: false,
                observations: "",
              },
            ],
          })
        }
      >
        Añadir ingrediente
      </button>

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

      {hasPendingResolution(draft, ingredients, units, categories, tags) && (
        <p role="alert">
          Resuelve, aprueba como nuevo o descarta explícitamente cada dato
          pendiente antes de confirmar.
        </p>
      )}
      <button
        disabled={
          busy ||
          hasPendingResolution(draft, ingredients, units, categories, tags)
        }
      >
        Confirmar y crear receta
      </button>
      <button type="button" onClick={onDiscard}>
        Descartar
      </button>
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
  const selected =
    value.mode === "existing" ? `existing:${value.existingId}` : value.mode;
  const collision = findCollision(value, existing);
  const selectedName = existing.find(
    (item) => item.id === value.existingId,
  )?.name;
  return (
    <div className="import-reference">
      {value.proposedName && (
        <p>
          Detectado por IA: <strong>{value.proposedName}</strong>.{" "}
          {value.proposalStatus === "new"
            ? "No existe en catálogo."
            : value.proposalStatus === "matched"
              ? "Coincide con el catálogo."
              : "Requiere revisión."}
        </p>
      )}
      {parentName && (
        <p>
          Variante de: <strong>{parentName}</strong>
        </p>
      )}
      {value.mode === "existing" && (
        <p>Resuelto contra existente: {selectedName}</p>
      )}
      {value.mode === "discarded" && (
        <p>Descartado: no se guardará este dato.</p>
      )}
      <label>
        {label}
        <select
          aria-label={label}
          value={selected}
          onChange={(event) => {
            const next = event.target.value;
            if (next.startsWith("existing:"))
              onChange({
                ...value,
                mode: "existing",
                existingId: next.slice(9),
                approved: false,
              });
            else if (next === "new")
              onChange({
                ...value,
                mode: "new",
                existingId: "",
                approved: false,
              });
            else if (next === "discarded")
              onChange({
                ...value,
                mode: "discarded",
                existingId: "",
                approved: false,
              });
            else
              onChange({
                ...value,
                mode: "unresolved",
                existingId: "",
                approved: false,
              });
          }}
        >
          <option value="unresolved">
            {required ? "Resolver dato obligatorio…" : "Resolver…"}
          </option>
          {existing.map((item) => (
            <option key={item.id} value={`existing:${item.id}`}>
              {item.name}
            </option>
          ))}
          <option value="new">Crear nuevo…</option>
          {allowDiscard && <option value="discarded">Descartar dato</option>}
        </select>
      </label>
      {value.mode === "unresolved" && (
        <>
          <p role="alert">{label}: pendiente de resolución o aprobación</p>
          {value.createName && (
            <button
              type="button"
              onClick={() =>
                onChange({ ...value, mode: "new", approved: false })
              }
            >
              Revisar creación de {value.createName}
            </button>
          )}
        </>
      )}
      {value.mode === "new" && (
        <>
          <label>
            Nuevo nombre
            <input
              aria-label={`${label} nuevo nombre`}
              value={value.createName}
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
              Abreviatura
              <input
                aria-label={`${label} abreviatura`}
                value={value.createAbbreviation}
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
          {collision ? (
            <p role="alert">
              Ya existe «{collision.name}». Selecciónalo en {label}; no se
              creará un duplicado.
            </p>
          ) : (
            <p>
              {value.approved
                ? "Aprobado para crear al confirmar la receta."
                : "Propuesta pendiente de aprobación. No se guardará todavía."}
            </p>
          )}
          {parentPending && (
            <p role="alert">Resuelve o aprueba primero el ingrediente base.</p>
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
            onClick={() => onChange({ ...value, approved: true })}
          >
            Aprobar creación de {label.toLocaleLowerCase("es")}
          </button>
        </>
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

function hasPendingResolution(
  draft: Draft,
  ingredients: Ingredient[],
  units: Unit[],
  categories: Named[],
  tags: Named[],
) {
  return (
    draft.ingredients.some(
      (item) =>
        item.ingredient.mode === "discarded" ||
        isPending(item.ingredient) ||
        !!findCollision(item.ingredient, ingredients) ||
        !!findCollision(
          item.variant,
          ingredients.find((base) => base.id === item.ingredient.existingId)
            ?.variants ?? [],
        ) ||
        !!findCollision(item.unit, units) ||
        isPending(item.variant) ||
        isPending(item.unit, true),
    ) ||
    draft.categories.some(
      (item) => isPending(item) || !!findCollision(item, categories),
    ) ||
    draft.tags.some((item) => isPending(item) || !!findCollision(item, tags))
  );
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
