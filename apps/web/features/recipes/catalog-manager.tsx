import { useRef, useState } from "react";
import { apiFetch, apiUrl, responseError } from "../../lib/api";

type Named = { id: string; name: string; abbreviation?: string };
type Ingredient = Named & { variants: Named[] };
export function CatalogManager({
  ingredients,
  units,
  categories,
  tags,
  refresh,
}: {
  ingredients: Ingredient[];
  units: Named[];
  categories: Named[];
  tags: Named[];
  refresh(): Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("ingredients");
  const [action, setAction] = useState("new");
  const editing = action !== "new";
  const deleting = action === "delete";
  const [confirmed, setConfirmed] = useState(false);
  const reloadMessage = useRef("Catálogo guardado.");
  const [id, setId] = useState("");
  const [base, setBase] = useState("");
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadPending, setReloadPending] = useState(false);
  const [savedItem, setSavedItem] = useState<Named | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items =
    kind === "ingredients"
      ? ingredients
      : kind === "units"
        ? units
        : kind === "categories"
          ? categories
          : kind === "tags"
            ? tags
            : (ingredients.find((item) => item.id === base)?.variants ?? []);
  const reset = () => {
    setConfirmed(false);
    setId("");
    setName("");
    setAbbreviation("");
    setMessage("");
    setSavedItem(null);
  };
  const close = () => {
    if (busy) return;
    setOpen(false);
    trigger.current?.focus();
  };
  async function save() {
    if (busy || reloadPending || (editing && !id) || (deleting && !confirmed))
      return;
    setBusy(true);
    setMessage("");
    try {
      const path =
        kind === "variants"
          ? `catalog/ingredients/${base}/variants`
          : `${kind === "ingredients" || kind === "units" ? "catalog" : "classifications"}/${kind}`;
      const response = await apiFetch(
        `${apiUrl}/${path}${editing ? `/${id}` : ""}`,
        {
          method: deleting ? "DELETE" : editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          ...(deleting
            ? {}
            : {
                body: JSON.stringify({
                  name,
                  ...(kind === "units" ? { abbreviation } : {}),
                }),
              }),
        },
      );
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            deleting
              ? "No se pudo eliminar el elemento"
              : "No se pudo guardar el catálogo",
          ),
        );
      if (deleting) {
        reloadMessage.current = "Elemento eliminado.";
        reset();
      } else {
        const saved = (await response.json()) as { id: string };
        reloadMessage.current = "Catálogo guardado.";
        setId(saved.id);
        setAction("edit");
        setSavedItem({ id: saved.id, name, abbreviation });
      }
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    try {
      await refresh();
      setReloadPending(false);
      setMessage(reloadMessage.current);
    } catch {
      setReloadPending(true);
      setMessage(
        `${reloadMessage.current} No se pudo recargar. Reintenta sólo la recarga.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="catalog-manager"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="quiet"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen(!open)}
      >
        Gestionar catálogos
      </button>
      {open && (
        <div className="panel">
          <h3>Catálogos</h3>
          {editing && !deleting && (
            <p>
              Los cambios de nombres, etiquetas y unidades se reflejan en todas
              las recetas que los usan. No convierten cantidades.
            </p>
          )}
          <form
            className="catalog-manager-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label>
              Tipo
              <select
                value={kind}
                disabled={busy || reloadPending}
                onChange={(event) => {
                  setKind(event.target.value);
                  setBase("");
                  reset();
                }}
              >
                <option value="ingredients">Ingredientes</option>
                <option value="variants">Variantes</option>
                <option value="units">Unidades</option>
                <option value="categories">Categorías</option>
                <option value="tags">Etiquetas</option>
              </select>
            </label>
            <label>
              Acción
              <select
                value={action}
                disabled={busy || reloadPending}
                onChange={(event) => {
                  setAction(event.target.value);
                  reset();
                }}
              >
                <option value="new">Nuevo</option>
                <option value="edit">Editar</option>
                <option value="delete">Eliminar</option>
              </select>
            </label>
            {kind === "variants" && (
              <label>
                Ingrediente base
                <select
                  required
                  value={base}
                  disabled={busy || reloadPending}
                  onChange={(event) => {
                    setBase(event.target.value);
                    reset();
                  }}
                >
                  <option value="">Selecciona</option>
                  {ingredients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editing && (
              <label>
                Elemento
                <select
                  required
                  value={id}
                  disabled={busy || reloadPending}
                  onChange={(event) => {
                    const item = items.find(
                      (item) => item.id === event.target.value,
                    );
                    setConfirmed(false);
                    setMessage("");
                    setId(event.target.value);
                    setName(item?.name ?? "");
                    setAbbreviation(item?.abbreviation ?? "");
                  }}
                >
                  <option value="">Selecciona</option>
                  {savedItem &&
                    !items.some((item) => item.id === savedItem.id) && (
                      <option value={savedItem.id}>{savedItem.name}</option>
                    )}
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!deleting && (
              <label>
                Nombre de catálogo
                <input
                  required
                  value={name}
                  disabled={busy || reloadPending}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            {kind === "units" && !deleting && (
              <label>
                Abreviatura
                <input
                  required
                  value={abbreviation}
                  disabled={busy || reloadPending}
                  onChange={(event) => setAbbreviation(event.target.value)}
                />
              </label>
            )}
            {deleting && id && (
              <label className="catalog-delete-confirmation">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy || reloadPending}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Confirmo eliminar «{name}». Solo se eliminará si no está en uso.
              </label>
            )}
            <button
              disabled={
                busy || reloadPending || (deleting && (!id || !confirmed))
              }
            >
              {deleting ? "Eliminar elemento" : "Guardar catálogo"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="quiet"
              onClick={close}
            >
              Cerrar catálogos
            </button>
          </form>
          {reloadPending && (
            <button type="button" disabled={busy} onClick={() => void reload()}>
              Reintentar recarga
            </button>
          )}
          <p role="status">{message}</p>
        </div>
      )}
    </section>
  );
}
