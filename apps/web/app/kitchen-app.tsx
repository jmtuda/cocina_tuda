"use client";

import { useEffect, useState } from "react";
import { ImportWorkspace } from "../features/import/import-workspace";
import { PlanningWorkspace } from "../features/planning/planning-workspace";
import { RecipeWorkspace } from "../features/recipes/recipe-workspace";
import { ShoppingWorkspace } from "../features/shopping/shopping-workspace";
import { apiFetch } from "../lib/api";

const areas = [
  { id: "library", label: "Biblioteca" },
  { id: "import", label: "Importar" },
  { id: "planning", label: "Plan semanal" },
  { id: "shopping", label: "Lista de compra" },
] as const;

type Area = (typeof areas)[number]["id"];
const backendMessage =
  "No se puede conectar con el servicio de Cocina Tuda. Los cambios no se guardarán hasta que la aplicación y la base de datos estén iniciadas.";

export function KitchenApp() {
  const [area, setArea] = useState<Area>("library");
  const [backendError, setBackendError] = useState("");

  async function checkBackend() {
    try {
      const response = await apiFetch("/health", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setBackendError("");
    } catch {
      setBackendError(backendMessage);
    }
  }

  useEffect(() => {
    void apiFetch("/health", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) setBackendError(backendMessage);
      })
      .catch(() => setBackendError(backendMessage));
  }, []);

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            CT
          </span>
          <div>
            <strong>Cocina Tuda</strong>
            <span>Tu cocina, bien organizada</span>
          </div>
        </div>
        <nav className="app-nav" aria-label="Secciones principales">
          {areas.map((item) => (
            <button
              className={area === item.id ? "active" : ""}
              aria-current={area === item.id ? "page" : undefined}
              key={item.id}
              onClick={() => setArea(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {backendError && (
        <div className="connection-error" role="alert">
          <span>{backendError}</span>
          <button
            className="quiet"
            onClick={() => {
              setBackendError("");
              void checkBackend();
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <main className="app-main">
        {area === "library" && <RecipeWorkspace />}
        {area === "import" && <ImportWorkspace />}
        {area === "planning" && <PlanningWorkspace />}
        {area === "shopping" && <ShoppingWorkspace />}
      </main>
    </div>
  );
}
