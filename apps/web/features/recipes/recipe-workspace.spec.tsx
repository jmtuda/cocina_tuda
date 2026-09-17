import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";

const ingredients = [
  {
    id: "ingredient-1",
    name: "Tomate",
    variants: [
      { id: "variant-1", ingredientId: "ingredient-1", name: "Chérry" },
    ],
  },
  { id: "ingredient-2", name: "Albahaca", variants: [] },
];
const units = [{ id: "unit-1", name: "Gramo", abbreviation: "g" }];
const categories = [{ id: "category-1", name: "Italiana" }];
const tags = [{ id: "tag-1", name: "Rápida" }];

describe("RecipeWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("preserves every recipe field when editing multiple steps and ingredients", async () => {
    const summary = {
      id: "recipe-id",
      name: "Ensalada",
      status: "ACTIVE",
      categories,
      tags,
    };
    const detail = {
      ...summary,
      description: "Fresca",
      author: "Tuda",
      servings: 2,
      difficulty: "Fácil",
      notes: "Servir fría",
      steps: [{ text: "Cortar" }, { text: "Mezclar" }],
      ingredients: [
        {
          ingredientId: "ingredient-1",
          variantId: "variant-1",
          quantity: "125.500",
          unitId: "unit-1",
          optional: true,
          observations: "Partidos",
        },
        {
          ingredientId: "ingredient-2",
          variantId: null,
          quantity: null,
          unitId: null,
          optional: false,
          observations: "Al gusto",
        },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(ingredients)))
      .mockResolvedValueOnce(new Response(JSON.stringify(units)))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories)))
      .mockResolvedValueOnce(new Response(JSON.stringify(tags)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [summary], totalPages: 1 })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(detail)))
      .mockResolvedValueOnce(new Response(JSON.stringify(detail)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [summary], totalPages: 1 })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await user.click(await screen.findByRole("button", { name: /Ensalada/ }));

    expect(screen.getByLabelText("Descripción")).toHaveValue("Fresca");
    expect(screen.getByLabelText("Autor")).toHaveValue("Tuda");
    expect(screen.getByLabelText("Raciones")).toHaveValue(2);
    expect(screen.getByLabelText("Dificultad")).toHaveValue("Fácil");
    expect(screen.getByLabelText("Notas")).toHaveValue("Servir fría");
    expect(screen.getByLabelText("Paso 1")).toHaveValue("Cortar");
    expect(screen.getByLabelText("Paso 2")).toHaveValue("Mezclar");
    expect(screen.getAllByLabelText("Variante")[0]).toHaveValue("variant-1");
    expect(screen.getAllByLabelText("Opcional")[0]).toBeChecked();
    expect(screen.getAllByLabelText("Observaciones")[0]).toHaveValue(
      "Partidos",
    );

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
    const request = fetchMock.mock.calls[6]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      name: "Ensalada",
      description: "Fresca",
      author: "Tuda",
      servings: 2,
      difficulty: "Fácil",
      notes: "Servir fría",
      steps: [
        { position: 0, text: "Cortar" },
        { position: 1, text: "Mezclar" },
      ],
      ingredients: [
        {
          position: 0,
          ingredientId: "ingredient-1",
          variantId: "variant-1",
          quantity: "125.500",
          unitId: "unit-1",
          optional: true,
          observations: "Partidos",
        },
        {
          position: 1,
          ingredientId: "ingredient-2",
          optional: false,
          observations: "Al gusto",
        },
      ],
      categoryIds: ["category-1"],
      tagIds: ["tag-1"],
    });
  });

  it("creates ingredients, variants and units from the catalog interface", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(ingredients)))
      .mockResolvedValueOnce(new Response(JSON.stringify(units)))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories)))
      .mockResolvedValueOnce(new Response(JSON.stringify(tags)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "new" })))
      .mockResolvedValueOnce(new Response(JSON.stringify(ingredients)))
      .mockResolvedValueOnce(new Response(JSON.stringify(units)))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories)))
      .mockResolvedValueOnce(new Response(JSON.stringify(tags)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await user.type(screen.getByLabelText("Nuevo ingrediente"), "Patata");
    await user.click(screen.getAllByRole("button", { name: "Agregar" })[0]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(9));
    expect(String(fetchMock.mock.calls[4]?.[0])).toMatch(
      /catalog\/ingredients$/,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toEqual({
      name: "Patata",
    });
  });
});
