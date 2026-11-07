"use client";

import { useEffect, useRef, useState } from "react";
import { MamboSummary } from "../recipes/mambo";
import { readConsultation, type RecipeDetail } from "./read-api";

export function RecipeReader({ id, onBack }: { id: string; onBack(): void }) {
  const [read, setRead] = useState<{
    key: string;
    recipe: RecipeDetail | null;
    error: string;
  }>({ key: "", recipe: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const readKey = JSON.stringify([id, attempt]);
  const recipe = read.key === readKey ? read.recipe : null;
  const error = read.key === readKey ? read.error : "";
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    void readConsultation<RecipeDetail>(
      `/recipes/${encodeURIComponent(id)}`,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setRead({ key: readKey, recipe: value, error: "" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setRead({
            key: readKey,
            recipe: null,
            error:
              reason instanceof Error
                ? reason.message
                : "No se pudo abrir la receta.",
          });
      });
    return () => controller.abort();
  }, [id, attempt, readKey]);

  useEffect(() => {
    if (recipe) heading.current?.focus();
  }, [recipe]);

  return (
    <div className="reader-detail">
      <button type="button" className="reader-back" onClick={onBack}>
        ← Volver a las recetas
      </button>
      {!recipe && !error && <p role="status">Abriendo receta…</p>}
      {error && (
        <div role="alert" className="reader-error">
          <p>{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </button>
          <a href="/consulta">Volver a entrar</a>
        </div>
      )}
      {recipe && (
        <article>
          <header className="reader-recipe-heading">
            <h1 tabIndex={-1} ref={heading}>
              {recipe.name}
            </h1>
            <span
              className={`reader-badge ${recipe.reviewed ? "is-reviewed" : ""}`}
            >
              {recipe.reviewed ? "Revisada" : "Sin revisar"}
            </span>
            {recipe.description && <p>{recipe.description}</p>}
            <div className="reader-meta">
              {recipe.author && <span>Por {recipe.author}</span>}
              {recipe.servings != null && (
                <span>{recipe.servings} raciones</span>
              )}
              {recipe.difficulty && <span>{recipe.difficulty}</span>}
              {[...recipe.categories, ...recipe.tags].map((item) => (
                <span key={item.id}>{item.name}</span>
              ))}
            </div>
          </header>
          <section aria-labelledby="reader-ingredients-heading">
            <h2 id="reader-ingredients-heading">Ingredientes</h2>
            {!recipe.ingredients.length && (
              <p>No hay ingredientes indicados.</p>
            )}
            <ul className="reader-ingredients">
              {recipe.ingredients.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.ingredient.name}</strong>
                    {item.variant && <span> · {item.variant.name}</span>}
                  </div>
                  {(item.quantity != null || item.unit) && (
                    <span className="reader-quantity">
                      {[item.quantity, item.unit?.abbreviation]
                        .filter((value) => value != null && value !== "")
                        .join(" ")}
                    </span>
                  )}
                  {item.optional && <small>Opcional</small>}
                  {item.observations && <p>{item.observations}</p>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="reader-steps-heading">
            <h2 id="reader-steps-heading">Preparación</h2>
            {!recipe.steps.length && <p>No hay pasos indicados.</p>}
            <ol className="reader-steps">
              {recipe.steps.map((step) => (
                <li key={step.id}>
                  <p>{step.text}</p>
                  <MamboSummary value={step.mambo} />
                </li>
              ))}
            </ol>
          </section>
          {recipe.notes && (
            <section
              className="reader-notes"
              aria-labelledby="reader-notes-heading"
            >
              <h2 id="reader-notes-heading">Notas</h2>
              <p>{recipe.notes}</p>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
