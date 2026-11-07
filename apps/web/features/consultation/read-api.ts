import type { MamboConfiguration } from "../recipes/mambo";
import { apiFetch } from "../../lib/api";

export type Named = { id: string; name: string };
export type RecipeSummary = Named & {
  description: string | null;
  reviewed: boolean;
  categories: Named[];
  tags: Named[];
};
export type RecipeResult = {
  items: RecipeSummary[];
  total: number;
  totalPages: number;
};
export type RecipeDetail = RecipeSummary & {
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  steps: Array<{
    id: string;
    position: number;
    text: string;
    mambo?: MamboConfiguration | null;
  }>;
  ingredients: Array<{
    id: string;
    quantity: string | null;
    optional: boolean;
    observations: string | null;
    ingredient: Named;
    variant: Named | null;
    unit: (Named & { abbreviation: string }) | null;
  }>;
};

// Only these three read endpoints are exposed to the consultation interface.
export async function readConsultation<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  if (
    !/^\/(?:recipes(?:\?[^#]*|\/[a-z0-9-]+)?|classifications\/categories)$/.test(
      path,
    )
  ) {
    throw new Error("Consulta no permitida.");
  }
  const response = await apiFetch(`/api/v1${path}`, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
    signal,
  });
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.redirected ||
    !isJson
  ) {
    throw new Error(
      "No se puede leer la respuesta. Comprueba tu sesión y vuelve a entrar.",
    );
  }
  if (response.status === 404)
    throw new Error("Esta receta ya no está disponible.");
  if (!response.ok)
    throw new Error(
      "No se pudieron consultar las recetas. Inténtalo de nuevo.",
    );
  return response.json() as Promise<T>;
}
