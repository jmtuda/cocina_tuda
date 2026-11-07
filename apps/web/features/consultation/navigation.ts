export type ConsultationQuery = {
  q: string;
  category: string;
  page: number;
  recipe: string;
};
export const emptyQuery: ConsultationQuery = {
  q: "",
  category: "",
  page: 1,
  recipe: "",
};

export function consultationQuery(search: string): ConsultationQuery {
  const params = new URLSearchParams(search);
  const page = Number(params.get("page") ?? 1);
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    recipe: params.get("receta") ?? "",
  };
}

export function consultationHref(query: ConsultationQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.recipe) params.set("receta", query.recipe);
  return `/consulta${params.size ? `?${params}` : ""}`;
}
