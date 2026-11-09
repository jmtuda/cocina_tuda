import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";

const catalog = [
  {
    id: "tomato",
    name: "Tomate",
    variants: [{ id: "cherry", ingredientId: "tomato", name: "Chérry" }],
  },
  { id: "water", name: "Agua", variants: [] },
];
const initial = {
  id: "recipe-1",
  name: "Sopa",
  reviewed: false,
  status: "ACTIVE",
  description: "Descripción",
  author: "Tuda",
  servings: 2,
  difficulty: "Fácil",
  notes: "Notas",
  categories: [{ id: "category-1", name: "Sopas" }],
  tags: [{ id: "tag-1", name: "Rápida" }],
  steps: [
    {
      position: 0,
      text: "Picar",
      mambo: { speed: 0, ct: 0, durationSeconds: 90, observations: "Robot" },
    },
    { position: 1, text: "Servir", mambo: null },
  ],
  ingredients: [
    {
      position: 0,
      ingredientId: "tomato",
      variantId: "cherry",
      quantity: "0",
      unitId: "gram",
      optional: true,
      observations: "Partidos",
    },
    {
      position: 1,
      ingredientId: "water",
      variantId: null,
      quantity: null,
      unitId: null,
      optional: false,
      observations: null,
    },
  ],
};

function api() {
  let recipe = structuredClone(initial);
  const writes: Array<typeof initial> = [];
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      if (init?.body) {
        const payload = JSON.parse(String(init.body)) as typeof initial;
        writes.push(payload);
        recipe = { ...recipe, ...payload };
      }
      const url = String(input);
      const result = url.includes("/recipes?")
        ? { items: [recipe], totalPages: 1 }
        : url.includes("/recipes")
          ? recipe
          : url.endsWith("/ingredients")
            ? catalog
            : url.endsWith("/units")
              ? [{ id: "gram", name: "Gramo", abbreviation: "g" }]
              : url.endsWith("/categories")
                ? initial.categories
                : initial.tags;
      return new Response(JSON.stringify(result));
    });
  vi.stubGlobal("fetch", fetchMock);
  return { writes, fetchMock };
}

async function edit(user: ReturnType<typeof userEvent.setup>) {
  render(<RecipeWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: /Sopa.*Sin revisar/ }),
  );
  await user.click(screen.getByRole("button", { name: "Editar" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("moves whole rows in both directions, preserves DOM identity and saves contiguous positions and all data", async () => {
  const { writes } = api();
  const user = userEvent.setup();
  await edit(user);
  expect(screen.getByRole("button", { name: "Subir paso 1" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Bajar paso 2" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Subir ingrediente 1" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Bajar ingrediente 2" }),
  ).toBeDisabled();

  const firstStep = screen.getByLabelText("Paso 1");
  const robot = screen.getByLabelText("Velocidad Mambo paso 1");
  const firstIngredient = screen.getByLabelText("Ingrediente 1");
  await user.type(firstStep, " fino");
  await user.type(screen.getAllByLabelText("Observaciones")[0], " pequeños");
  await user.click(screen.getByRole("button", { name: "Bajar paso 1" }));
  expect(screen.getByLabelText("Paso 2")).toBe(firstStep);
  expect(screen.getByLabelText("Velocidad Mambo paso 2")).toBe(robot);
  await user.click(screen.getByRole("button", { name: "Subir paso 2" }));
  expect(screen.getByLabelText("Paso 1")).toBe(firstStep);
  await user.click(screen.getByRole("button", { name: "Bajar paso 1" }));
  await user.click(screen.getByRole("button", { name: "Subir ingrediente 2" }));
  expect(screen.getByLabelText("Ingrediente 2")).toBe(firstIngredient);
  await user.click(screen.getByRole("button", { name: "Bajar ingrediente 1" }));
  expect(screen.getByLabelText("Ingrediente 1")).toBe(firstIngredient);
  await user.click(screen.getByRole("button", { name: "Bajar ingrediente 1" }));
  await user.click(
    screen.getByRole("button", { name: "Marcar como revisada" }),
  );
  expect(writes).toHaveLength(0);

  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText("Receta guardada.");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toEqual({
    name: "Sopa",
    description: initial.description,
    author: initial.author,
    servings: initial.servings,
    difficulty: initial.difficulty,
    notes: initial.notes,
    reviewed: true,
    categoryIds: ["category-1"],
    tagIds: ["tag-1"],
    steps: [
      { position: 0, text: "Servir" },
      { position: 1, text: "Picar fino", mambo: initial.steps[0].mambo },
    ],
    ingredients: [
      { position: 0, ingredientId: "water", optional: false },
      {
        ...initial.ingredients[0],
        position: 1,
        observations: "Partidos pequeños",
      },
    ],
  });
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText("Revisada")).toBeVisible();
  expect(dialog.getByText("Vel. 0 · CT 0 · 1 m 30 s · Robot")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Editar" }));
  expect(screen.getByLabelText("Paso 1")).toHaveValue("Servir");
  expect(screen.getByLabelText("Paso 2")).toHaveValue("Picar fino");
  expect(screen.getByLabelText("Temperatura (°C) Mambo paso 2")).toHaveValue(
    null,
  );
  expect(screen.getByLabelText("Ingrediente 1")).toHaveValue("water");
  expect(screen.getAllByLabelText("Cantidad")[0]).toHaveValue("");
  expect(screen.getAllByLabelText("Cantidad")[1]).toHaveValue("0");
  expect(screen.getAllByLabelText("Variante")[1]).toHaveValue("cherry");
  expect(screen.getAllByLabelText("Opcional")[1]).toBeChecked();
});

it("cancels order and review changes without writing or changing the original associations", async () => {
  const { writes } = api();
  const user = userEvent.setup();
  await edit(user);
  await user.click(screen.getByRole("button", { name: "Bajar paso 1" }));
  await user.click(screen.getByRole("button", { name: "Bajar ingrediente 1" }));
  await user.click(
    screen.getByRole("button", { name: "Marcar como revisada" }),
  );
  await user.click(screen.getByRole("button", { name: "Cancelar edición" }));
  expect(writes).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Editar" }));
  expect(screen.getByLabelText("Paso 1")).toHaveValue("Picar");
  expect(screen.getByLabelText("Velocidad Mambo paso 1")).toHaveValue(0);
  expect(screen.getByLabelText("Ingrediente 1")).toHaveValue("tomato");
  expect(
    screen.getByRole("button", { name: "Marcar como revisada" }),
  ).toHaveAttribute("aria-pressed", "false");
});

it("supports ordering new recipes and deleting a moved row without transferring its Mambo", async () => {
  const { writes } = api();
  const user = userEvent.setup();
  render(<RecipeWorkspace mode="create" />);
  await screen.findByText("Biblioteca lista.");
  await user.type(screen.getByLabelText("Nombre"), "Nueva");
  await user.click(screen.getByRole("button", { name: "Añadir paso" }));
  await user.type(screen.getByLabelText("Paso 1"), "Picar");
  await user.click(
    screen.getByRole("button", { name: "Añadir Mambo al paso 1" }),
  );
  await user.type(screen.getByLabelText("Velocidad Mambo paso 1"), "0");
  await user.click(screen.getByRole("button", { name: "Añadir paso" }));
  await user.type(screen.getByLabelText("Paso 2"), "Servir");
  await user.click(screen.getByRole("button", { name: "Bajar paso 1" }));
  await user.click(screen.getByRole("button", { name: "Eliminar paso 1" }));
  expect(screen.getByLabelText("Paso 1")).toHaveValue("Picar");
  expect(screen.getByLabelText("Velocidad Mambo paso 1")).toHaveValue(0);
  expect(screen.getByRole("button", { name: "Subir paso 1" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Bajar paso 1" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Añadir ingrediente" }));
  await user.selectOptions(screen.getByLabelText("Ingrediente 1"), "tomato");
  await user.click(screen.getByRole("button", { name: "Añadir ingrediente" }));
  await user.selectOptions(screen.getByLabelText("Ingrediente 2"), "water");
  await user.click(screen.getByRole("button", { name: "Subir ingrediente 2" }));
  await user.click(
    screen.getByRole("button", { name: "Eliminar ingrediente 2" }),
  );
  expect(screen.getByLabelText("Ingrediente 1")).toHaveValue("water");
  expect(
    screen.getByRole("button", { name: "Subir ingrediente 1" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Bajar ingrediente 1" }),
  ).toBeDisabled();
  expect(writes).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Crear receta" }));
  await screen.findByText("Receta guardada.");
  expect(writes[0].steps).toEqual([
    { position: 0, text: "Picar", mambo: { speed: 0 } },
  ]);
  expect(writes[0].ingredients).toEqual([
    { position: 0, ingredientId: "water", optional: false },
  ]);
});
