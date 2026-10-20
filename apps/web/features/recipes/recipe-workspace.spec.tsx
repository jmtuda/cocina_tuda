import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
  it("keeps multiple filters in a compact dropdown and clears the query immediately", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);
        const data = url.includes("/recipes?")
          ? { items: [], totalPages: 2 }
          : url.endsWith("/ingredients")
            ? ingredients
            : url.endsWith("/units")
              ? units
              : url.endsWith("/categories")
                ? categories
                : tags;
        return new Response(JSON.stringify(data));
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);
    await screen.findByText("Biblioteca lista.");
    expect(
      screen.queryByRole("checkbox", { name: "Tomate" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Ingredientes \(todos\)/ }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Tomate" }));
    await user.click(screen.getByRole("checkbox", { name: "Albahaca" }));
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: /Ingredientes \(todos\)/ }),
    ).toHaveFocus();
    expect(
      screen.queryByRole("checkbox", { name: "Tomate" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar"), "sopa");
    await user.selectOptions(screen.getByLabelText("Estado"), "ARCHIVED");
    for (const [label, option] of [
      [/^Categorías/, "Italiana"],
      [/^Etiquetas/, "Rápida"],
      [/^Variantes/, "Tomate: Chérry"],
    ] as const) {
      await user.click(screen.getByRole("button", { name: label }));
      await user.click(screen.getByRole("checkbox", { name: option }));
      await user.keyboard("{Escape}");
    }
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
      "ingredient=ingredient-1%2Cingredient-2",
    );
    const applied = new URL(
      String(fetchMock.mock.calls.at(-1)?.[0]),
      "http://local",
    ).searchParams;
    expect(Object.fromEntries(applied)).toMatchObject({
      status: "ARCHIVED",
      q: "sopa",
      category: "category-1",
      tag: "tag-1",
      variant: "variant-1",
    });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Borrar filtros" }));
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(
      "/api/v1/recipes?page=1&pageSize=20&status=ACTIVE",
    );
    expect(screen.getByLabelText("Buscar")).toHaveValue("");
    expect(screen.getByLabelText("Estado")).toHaveValue("ACTIVE");
  });
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...detail, name: "Ensalada actualizada" }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);

    await user.click(await screen.findByRole("button", { name: /Ensalada/ }));
    expect(
      await screen.findByRole("dialog", { name: "Ensalada" }),
    ).toBeVisible();
    expect(screen.getByText("Cortar")).toBeVisible();
    expect(screen.getByText("Mezclar")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Editar" }));

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

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Cambio descartado");
    await user.click(screen.getByRole("button", { name: "Cancelar edición" }));
    expect(
      screen.queryByDisplayValue("Cambio descartado"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ensalada");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(9));
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).not.toBeInTheDocument();
    const request = fetchMock.mock.calls[6]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      name: "Ensalada",
      reviewed: false,
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
    expect(
      await screen.findByRole("dialog", { name: "Ensalada actualizada" }),
    ).toBeVisible();
    expect(screen.getByText("Cortar")).toBeVisible();
    expect(screen.getByText("Mezclar")).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("creates ingredients, variants and units from the catalog interface", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(ingredients)))
      .mockResolvedValueOnce(new Response(JSON.stringify(units)))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories)))
      .mockResolvedValueOnce(new Response(JSON.stringify(tags)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [], totalPages: 1 })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "new" })))
      .mockResolvedValueOnce(new Response(JSON.stringify(ingredients)))
      .mockResolvedValueOnce(new Response(JSON.stringify(units)))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories)))
      .mockResolvedValueOnce(new Response(JSON.stringify(tags)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(
      screen.queryByLabelText("Nombre de catálogo"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Gestionar catálogos" }),
    );
    await user.type(screen.getByLabelText("Nombre de catálogo"), "Patata");
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10));
    expect(String(fetchMock.mock.calls[5]?.[0])).toMatch(
      /catalog\/ingredients$/,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body))).toEqual({
      name: "Patata",
    });
  });
});
