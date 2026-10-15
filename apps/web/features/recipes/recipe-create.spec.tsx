import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("creates exact zero, decimal and absent quantities and offers the library", async () => {
  const onLibrary = vi.fn();
  const summary = {
    id: "new-recipe",
    name: "Sopa",
    status: "ACTIVE",
    categories: [],
    tags: [],
  };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      let data: unknown = [];
      if (url.includes("/recipes?")) data = { items: [summary], totalPages: 1 };
      else if (url.endsWith("/ingredients"))
        data = [{ id: "i", name: "Tomate", variants: [] }];
      else if (init?.method === "POST") data = summary;
      else if (url.endsWith("/new-recipe"))
        data = { ...summary, steps: [], ingredients: [] };
      return new Response(JSON.stringify(data));
    });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<RecipeWorkspace mode="create" onLibrary={onLibrary} />);
  await screen.findByText("Biblioteca lista.");
  await user.type(screen.getByLabelText("Nombre"), "Sopa");
  for (const quantity of ["0", "125.500", ""]) {
    await user.click(
      screen.getByRole("button", { name: "Añadir ingrediente" }),
    );
    await user.selectOptions(
      screen.getAllByLabelText(/^Ingrediente \d/).at(-1)!,
      "i",
    );
    if (quantity)
      await user.type(screen.getAllByLabelText("Cantidad").at(-1)!, quantity);
  }
  await user.click(screen.getByRole("button", { name: "Crear receta" }));
  await screen.findByText("Receta guardada.");
  const payload = JSON.parse(
    String(
      fetchMock.mock.calls.find((call) => call[1]?.method === "POST")?.[1]
        ?.body,
    ),
  );
  expect(
    payload.ingredients.map((item: { quantity?: string }) => item.quantity),
  ).toEqual(["0", "125.500", undefined]);
  await user.click(screen.getByRole("button", { name: "Ver en biblioteca" }));
  expect(onLibrary).toHaveBeenCalledOnce();
});
