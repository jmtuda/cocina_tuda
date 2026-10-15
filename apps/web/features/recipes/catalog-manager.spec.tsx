import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";
const ingredients = [
  {
    id: "i",
    name: "Tomate",
    variants: [{ id: "v", ingredientId: "i", name: "Cherry" }],
  },
];
const units = [{ id: "u", name: "Gramo", abbreviation: "g" }];
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it.each([
  ["ingredients", "i", "catalog/ingredients"],
  ["variants", "v", "catalog/ingredients/i/variants"],
  ["units", "u", "catalog/units"],
  ["categories", "c", "classifications/categories"],
  ["tags", "t", "classifications/tags"],
])(
  "creates and edits %s without losing the recipe draft",
  async (kind, id, path) => {
    let conflict = false;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input, init) => {
        if (init?.method)
          return new Response(
            JSON.stringify(conflict ? { message: "Nombre duplicado" } : { id }),
            { status: conflict ? 409 : 200 },
          );
        const url = String(input);
        const data = url.includes("/recipes?")
          ? { items: [], totalPages: 1 }
          : url.endsWith("/ingredients")
            ? ingredients
            : url.endsWith("/units")
              ? units
              : url.endsWith("/categories")
                ? [{ id: "c", name: "Sopa" }]
                : [{ id: "t", name: "Rápida" }];
        return new Response(JSON.stringify(data));
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace mode="create" />);
    await screen.findByText("Biblioteca lista.");
    await user.type(screen.getByLabelText("Nombre"), "Borrador intacto");
    const trigger = screen.getByRole("button", { name: "Gestionar catálogos" });
    await user.click(trigger);
    await user.selectOptions(screen.getByLabelText("Tipo"), kind);
    if (kind === "variants")
      await user.selectOptions(screen.getByLabelText("Ingrediente base"), "i");
    await user.type(screen.getByLabelText("Nombre de catálogo"), "Nuevo");
    if (kind === "units")
      await user.type(screen.getByLabelText("Abreviatura"), "g");
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
    await screen.findByText("Catálogo guardado.");
    expect(
      fetchMock.mock.calls.find((call) => call[1]?.method === "POST"),
    ).toEqual([
      `/api/v1/${path}`,
      expect.objectContaining({
        body: JSON.stringify({
          name: "Nuevo",
          ...(kind === "units" ? { abbreviation: "g" } : {}),
        }),
      }),
    ]);
    await user.selectOptions(screen.getByLabelText("Acción"), "edit");
    await user.selectOptions(screen.getByLabelText("Elemento"), id);
    await user.clear(screen.getByLabelText("Nombre de catálogo"));
    await user.type(screen.getByLabelText("Nombre de catálogo"), "Renombrado");
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
    await screen.findByText("Catálogo guardado.");
    expect(
      fetchMock.mock.calls.find((call) => call[1]?.method === "PATCH"),
    ).toEqual([
      `/api/v1/${path}/${id}`,
      expect.objectContaining({
        body: JSON.stringify({
          name: "Renombrado",
          ...(kind === "units" ? { abbreviation: "g" } : {}),
        }),
      }),
    ]);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Borrador intacto");
    conflict = true;
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
    await screen.findByText(/Nombre duplicado/);
    expect(screen.getByLabelText("Nombre de catálogo")).toHaveValue(
      "Renombrado",
    );
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await waitFor(() =>
      expect(
        screen.queryByLabelText("Nombre de catálogo"),
      ).not.toBeInTheDocument(),
    );
  },
);
