import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps the edit draft through catalog refresh and retains archive and restore actions", async () => {
  const recipe = {
    id: "r",
    name: "Sopa",
    status: "ACTIVE",
    categories: [],
    tags: [],
    steps: [],
    ingredients: [
      {
        ingredientId: "i",
        quantity: "0",
        variantId: null,
        unitId: null,
        optional: false,
        observations: null,
      },
    ],
  };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      let data: unknown = [];
      if (url.endsWith("/archive")) recipe.status = "ARCHIVED";
      if (url.endsWith("/restore")) recipe.status = "ACTIVE";
      if (url.includes("/recipes?")) data = { items: [recipe], totalPages: 1 };
      else if (url.endsWith("/recipes/r")) data = recipe;
      else if (url.endsWith("/ingredients"))
        data = [{ id: "i", name: "Tomate", variants: [] }];
      else if (init?.method) data = { id: "i" };
      return new Response(JSON.stringify(data));
    });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<RecipeWorkspace />);
  await user.click(await screen.findByRole("button", { name: /Sopa/ }));
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.type(screen.getByLabelText("Nombre"), " borrador");
  await user.click(screen.getByRole("button", { name: "Gestionar catálogos" }));
  await user.type(screen.getByLabelText("Nombre de catálogo"), "Patata");
  await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
  await screen.findByText("Catálogo guardado.");
  expect(screen.getByLabelText("Nombre")).toHaveValue("Sopa borrador");
  expect(screen.getByLabelText("Ingrediente 1")).toHaveValue("i");
  expect(screen.getByLabelText("Cantidad")).toHaveValue("0");
  expect(document.querySelector("form form")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Cancelar edición" }));
  await user.click(screen.getByRole("button", { name: "Archivar" }));
  await user.click(await screen.findByRole("button", { name: "Reactivar" }));
  await screen.findByRole("button", { name: "Archivar" });
  expect(
    fetchMock.mock.calls
      .filter((call) => call[1]?.method === "POST")
      .map((call) => String(call[0])),
  ).toEqual([
    "/api/v1/catalog/ingredients",
    "/api/v1/recipes/r/archive",
    "/api/v1/recipes/r/restore",
  ]);
});
