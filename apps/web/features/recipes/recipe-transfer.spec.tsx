import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";

const initial = {
  id: "r",
  name: "Sopa",
  description: null,
  author: null,
  servings: null,
  difficulty: null,
  notes: null,
  status: "ACTIVE",
  reviewed: false,
  categories: [],
  tags: [],
  ingredients: [],
  steps: [
    { position: 0, text: "Cocer", mambo: { speed: 0, durationSeconds: 90 } },
  ],
};
function api(failListAfterSave = false) {
  let recipe = structuredClone(initial);
  let saved = false;
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.body) {
        recipe = {
          ...recipe,
          ...JSON.parse(String(init.body)),
          name: "Sopa guardada",
        };
        saved = true;
        return new Response(JSON.stringify(recipe));
      }
      if (url.includes("/recipes?")) {
        if (saved && failListAfterSave)
          return new Response("{}", { status: 503 });
        return new Response(JSON.stringify({ items: [recipe], totalPages: 1 }));
      }
      return new Response(
        JSON.stringify(url.endsWith("/recipes/r") ? recipe : []),
      );
    });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("uses the saved recipe response, refreshes the filtered list and never re-reads the detail", async () => {
  const fetchMock = api();
  const user = userEvent.setup();
  render(<RecipeWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: /Sopa.*Sin revisar/ }),
  );
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.type(screen.getByLabelText("Notas"), "Nota guardada");
  await user.click(
    screen.getByRole("button", { name: "Marcar como revisada" }),
  );
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText("Receta guardada.");
  expect(screen.getByRole("dialog", { name: "Sopa guardada" })).toBeVisible();
  expect(screen.getByText("Vel. 0 · 1 m 30 s")).toBeVisible();
  expect(
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith("/recipes/r") && !init?.method,
    ),
  ).toHaveLength(1);
  expect(
    fetchMock.mock.calls.filter(([url]) => String(url).includes("/recipes?")),
  ).toHaveLength(2);
  const write = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
  expect(JSON.parse(String(write?.[1]?.body))).toMatchObject({
    notes: "Nota guardada",
    reviewed: true,
    steps: initial.steps,
  });
});

it("does not load unused recipe lists in creation or request the detail after POST", async () => {
  const fetchMock = api();
  const user = userEvent.setup();
  render(<RecipeWorkspace mode="create" />);
  await screen.findByText("Biblioteca lista.");
  await user.type(screen.getByLabelText("Nombre"), "Nueva sopa");
  await user.click(screen.getByRole("button", { name: "Crear receta" }));
  await screen.findByText("Receta guardada.");
  expect(screen.getByRole("dialog", { name: "Sopa guardada" })).toBeVisible();
  expect(
    fetchMock.mock.calls.filter(([url]) => String(url).includes("/recipes")),
  ).toHaveLength(1);
  expect(
    fetchMock.mock.calls.find(([url]) => String(url).includes("/recipes"))?.[1]
      ?.method,
  ).toBe("POST");
});

it("keeps the confirmed save and warns separately when refreshing the list fails", async () => {
  const fetchMock = api(true);
  const user = userEvent.setup();
  render(<RecipeWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: /Sopa.*Sin revisar/ }),
  );
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText(/Receta guardada\. No se pudo actualizar el listado/);
  expect(screen.getByRole("dialog", { name: "Sopa guardada" })).toBeVisible();
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
  ).toHaveLength(1);
  expect(
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith("/recipes/r") && !init?.method,
    ),
  ).toHaveLength(1);
});
