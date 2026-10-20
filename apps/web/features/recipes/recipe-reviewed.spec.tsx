import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";

const initial = {
  id: "recipe-1",
  name: "Receta",
  reviewed: false,
  status: "ACTIVE",
  categories: [],
  tags: [],
  description: null,
  author: null,
  servings: null,
  difficulty: null,
  notes: null,
  steps: [
    { position: 0, text: "Cocer", mambo: { speed: 0, durationSeconds: 90 } },
  ],
  ingredients: [],
};
function api() {
  let recipe = structuredClone(initial);
  const writes: Array<typeof initial> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      if (init?.body) {
        recipe = { ...recipe, ...JSON.parse(String(init.body)) };
        writes.push(structuredClone(recipe));
      }
      const url = String(input);
      return new Response(
        JSON.stringify(
          url.includes("/recipes?")
            ? { items: [recipe], totalPages: 1 }
            : url.includes("/recipes")
              ? recipe
              : [],
        ),
      );
    }),
  );
  return writes;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "creates recipes with explicitly selected reviewed status %s",
  async (reviewed) => {
    const writes = api();
    const user = userEvent.setup();
    render(<RecipeWorkspace mode="create" />);
    await screen.findByText("Biblioteca lista.");
    expect(
      screen.getByRole("checkbox", { name: "Revisada" }),
    ).not.toBeChecked();
    await user.type(screen.getByLabelText("Nombre"), "Nueva receta");
    if (reviewed)
      await user.click(screen.getByRole("checkbox", { name: "Revisada" }));
    await user.click(screen.getByRole("button", { name: "Crear receta" }));
    await screen.findByText("Receta guardada.");
    expect(writes[0].reviewed).toBe(reviewed);
    expect(
      within(screen.getByRole("dialog")).getByText(
        reviewed ? "Revisada" : "Sin revisar",
      ),
    ).toBeVisible();
  },
);

it("toggles reviewed, preserves it when editing notes and cancels changes without losing Mambo", async () => {
  const writes = api();
  const user = userEvent.setup();
  render(<RecipeWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: /Receta.*Sin revisar/ }),
  );
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.click(screen.getByRole("checkbox", { name: "Revisada" }));
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText("Receta guardada.");
  expect(writes[0].reviewed).toBe(true);
  await user.click(screen.getByRole("button", { name: "Editar" }));
  expect(screen.getByRole("checkbox", { name: "Revisada" })).toBeChecked();
  await user.type(screen.getByLabelText("Notas"), "Otra nota");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText("Receta guardada.");
  expect(writes[1]).toMatchObject({
    reviewed: true,
    notes: "Otra nota",
    steps: initial.steps,
  });
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.click(screen.getByRole("checkbox", { name: "Revisada" }));
  await user.click(screen.getByRole("button", { name: "Cancelar edición" }));
  expect(writes).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Editar" }));
  expect(screen.getByRole("checkbox", { name: "Revisada" })).toBeChecked();
  await user.click(screen.getByRole("checkbox", { name: "Revisada" }));
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(writes).toHaveLength(3));
  expect(writes[2].reviewed).toBe(false);
  expect(writes[2].steps).toEqual(initial.steps);
});
