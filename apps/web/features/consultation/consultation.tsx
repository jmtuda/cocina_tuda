"use client";

import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { RecipeReader } from "./recipe-reader";
import {
  consultationHref,
  consultationQuery,
  emptyQuery,
  type ConsultationQuery,
} from "./navigation";
import { readConsultation, type Named, type RecipeResult } from "./read-api";

export function Consultation() {
  const [query, setQuery] = useState<ConsultationQuery>(emptyQuery);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Named[]>([]);
  const [catalogError, setCatalogError] = useState(false);
  const [read, setRead] = useState<{
    key: string;
    result: RecipeResult | null;
    error: string;
  }>({ key: "", result: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const readKey = JSON.stringify([
    query.q,
    query.category,
    query.page,
    attempt,
  ]);
  const loading = !ready || read.key !== readKey;
  const result = read.key === readKey ? read.result : null;
  const error = read.key === readKey ? read.error : "";
  const [offline, setOffline] = useState(false);
  const [lastRecipe, setLastRecipe] = useState("");
  const lastLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const sync = () => {
      const next = consultationQuery(window.location.search);
      setQuery(next);
      setSearch(next.q);
      setCategory(next.category);
      setReady(true);
    };
    const connection = () => setOffline(!navigator.onLine);
    sync();
    connection();
    window.addEventListener("popstate", sync);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void readConsultation<Named[]>(
      "/classifications/categories",
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) {
          setCategories(value);
          setCatalogError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      status: "ACTIVE",
      page: String(query.page),
      pageSize: "20",
    });
    if (query.q.trim()) params.set("q", query.q.trim());
    if (query.category) params.set("category", query.category);
    void readConsultation<RecipeResult>(`/recipes?${params}`, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted)
          setRead({ key: readKey, result: value, error: "" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setRead({
            key: readKey,
            result: null,
            error:
              reason instanceof Error
                ? reason.message
                : "No se pudieron consultar las recetas.",
          });
      });
    return () => controller.abort();
  }, [ready, query.q, query.category, query.page, attempt, readKey]);

  useEffect(() => {
    if (ready && !query.recipe) lastLink.current?.focus();
  }, [ready, query.recipe]);

  function navigate(next: ConsultationQuery, detail = false) {
    window.history.pushState(
      { consultationDetail: detail },
      "",
      consultationHref(next),
    );
    setQuery(next);
    setSearch(next.q);
    setCategory(next.category);
  }
  function openRecipe(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    setLastRecipe(id);
    navigate({ ...query, recipe: id }, true);
  }
  function back() {
    if (window.history.state?.consultationDetail) window.history.back();
    else {
      const next = { ...query, recipe: "" };
      window.history.replaceState(null, "", consultationHref(next));
      setQuery(next);
    }
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    navigate({ q: search.trim(), category, page: 1, recipe: "" });
  }

  return (
    <main className="consultation">
      <header className="reader-header">
        <span>Cocina Tuda</span>
        <span className="reader-mode">Solo consulta</span>
      </header>
      {offline && (
        <p className="reader-offline" role="status">
          Sin conexión. Necesitas Internet para consultar recetas.
        </p>
      )}
      {query.recipe ? (
        <RecipeReader key={query.recipe} id={query.recipe} onBack={back} />
      ) : (
        <>
          <h1>Mis recetas</h1>
          <form
            onSubmit={apply}
            className="reader-search"
            aria-label="Filtros de recetas"
          >
            <label>
              Buscar recetas
              <input
                type="search"
                enterKeyHint="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, ingrediente…"
              />
            </label>
            <label>
              Categoría
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Todas las categorías</option>
                {category &&
                  !categories.some((item) => item.id === category) && (
                    <option value={category}>Categoría seleccionada</option>
                  )}
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="reader-filter-actions">
              <button type="submit">Buscar</button>
              <button
                type="button"
                className="quiet"
                onClick={() => navigate({ ...emptyQuery })}
              >
                Limpiar
              </button>
            </div>
          </form>
          {catalogError && (
            <p className="reader-hint">
              No se pudieron cargar las categorías. Puedes buscar por texto o
              pulsar Actualizar para reintentarlo.
            </p>
          )}
          <div className="reader-results-heading">
            <h2>Recetas</h2>
            <button
              className="quiet"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Actualizar
            </button>
          </div>
          {loading && <p role="status">Cargando recetas…</p>}
          {error && (
            <div role="alert" className="reader-error">
              <p>{error}</p>
              <button onClick={() => setAttempt((value) => value + 1)}>
                Reintentar
              </button>
              <a href="/consulta">Volver a entrar</a>
            </div>
          )}
          {!loading && !error && result && (
            <>
              <p className="reader-hint" role="status">
                {result.total}{" "}
                {result.total === 1
                  ? "receta encontrada"
                  : "recetas encontradas"}
              </p>
              {!result.items.length && (
                <p>No hay recetas para esta búsqueda.</p>
              )}
              <ul className="reader-cards">
                {result.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={consultationHref({ ...query, recipe: item.id })}
                      ref={lastRecipe === item.id ? lastLink : undefined}
                      onClick={(event) => openRecipe(event, item.id)}
                    >
                      <h3>{item.name}</h3>
                      <span
                        className={`reader-badge ${item.reviewed ? "is-reviewed" : ""}`}
                      >
                        {item.reviewed ? "Revisada" : "Sin revisar"}
                      </span>
                      {item.description && <p>{item.description}</p>}
                      {!!item.categories.length && (
                        <small>
                          {item.categories
                            .map((value) => value.name)
                            .join(" · ")}
                        </small>
                      )}
                      <span className="reader-open">Ver receta →</span>
                    </a>
                  </li>
                ))}
              </ul>
              <nav
                className="reader-pagination"
                aria-label="Páginas de recetas"
              >
                <button
                  className="quiet"
                  disabled={query.page <= 1}
                  onClick={() => navigate({ ...query, page: query.page - 1 })}
                >
                  Anterior
                </button>
                <span>
                  Página {query.page} de {Math.max(1, result.totalPages)}
                </span>
                <button
                  className="quiet"
                  disabled={query.page >= result.totalPages}
                  onClick={() => navigate({ ...query, page: query.page + 1 })}
                >
                  Siguiente
                </button>
              </nav>
            </>
          )}
          <details className="reader-install">
            <summary>Instalar en Android</summary>
            <p>
              Abre esta dirección en Chrome, inicia sesión si se solicita y
              elige «Instalar aplicación» o «Añadir a pantalla de inicio» en el
              menú ⋮. La opción depende del navegador. La aplicación necesita
              conexión a Internet.
            </p>
          </details>
        </>
      )}
      <footer className="reader-footer">
        Consulta privada · sin edición · requiere conexión
      </footer>
    </main>
  );
}
