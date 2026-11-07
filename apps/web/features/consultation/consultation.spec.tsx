import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Consultation } from "./consultation";
import { RecipeReader } from "./recipe-reader";

const summary = {
  id: "recipe-1",
  name: "Sofrito",
  description: "Para probar la consulta",
  reviewed: true,
  categories: [{ id: "cat-1", name: "Verduras" }],
  tags: [],
};
const detail = {
  ...summary,
  author: "Cocina",
  servings: 2,
  difficulty: "Fácil",
  notes: "Servir caliente",
  ingredients: [
    {
      id: "i-1",
      ingredient: { id: "base-1", name: "Aceite" },
      quantity: "0",
      unit: { id: "u-1", name: "Gramo", abbreviation: "g" },
      optional: true,
      observations: "Al gusto",
      variant: null,
    },
    {
      id: "i-2",
      ingredient: { id: "base-2", name: "Tomate" },
      quantity: null,
      unit: null,
      optional: false,
      observations: null,
      variant: { id: "v-1", name: "Chérry" },
    },
  ],
  steps: [
    {
      id: "s-1",
      position: 0,
      text: "Sofreír",
      mambo: { speed: 0, temperature: 100, ct: 6, durationSeconds: 90 },
    },
    { id: "s-2", position: 1, text: "Servir", mambo: null },
  ],
};
const result = { items: [summary], total: 21, totalPages: 2 };
function mockApi() {
  const mock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = String(input);
    return Response.json(
      url.endsWith("/categories")
        ? summary.categories
        : url.includes("/recipes?")
          ? result
          : detail,
    );
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
beforeEach(() => window.history.replaceState(null, "", "/consulta"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("shows an Android-friendly read-only list and full recipe without write controls", async () => {
  const mock = mockApi();
  const user = userEvent.setup();
  render(<Consultation />);
  await user.click(await screen.findByRole("link", { name: /Sofrito/ }));
  expect(
    await screen.findByRole("heading", { name: "Sofrito", level: 1 }),
  ).toHaveFocus();
  expect(screen.getByText("0 g")).toBeVisible();
  expect(screen.getByText("Opcional")).toBeVisible();
  expect(screen.getByText(/Chérry/)).toBeVisible();
  expect(screen.getByText("Vel. 0 · 100 °C · CT 6 · 1 m 30 s")).toBeVisible();
  expect(screen.getAllByRole("listitem")).toHaveLength(4);
  expect(screen.getByText("Servir caliente")).toBeVisible();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", {
      name: /Editar|Guardar|Crear|Archivar|Importar/,
    }),
  ).not.toBeInTheDocument();
  expect(
    mock.mock.calls.every(
      ([, init]) => init?.method === "GET" && init.cache === "no-store",
    ),
  ).toBe(true);
});

it("keeps search, category and page when opening a recipe and using Android/browser back", async () => {
  const mock = mockApi();
  const user = userEvent.setup();
  render(<Consultation />);
  await screen.findByRole("link", { name: /Sofrito/ });
  await user.type(screen.getByLabelText("Buscar recetas"), "tomate");
  await user.selectOptions(screen.getByLabelText("Categoría"), "cat-1");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await screen.findByRole("link", { name: /Sofrito/ });
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 2");
  await user.click(screen.getByRole("link", { name: /Sofrito/ }));
  await screen.findByRole("heading", { name: "Sofrito", level: 1 });
  expect(window.location.search).toContain("receta=recipe-1");
  window.history.back();
  await screen.findByRole("heading", { name: "Mis recetas" });
  expect(screen.getByLabelText("Buscar recetas")).toHaveValue("tomate");
  expect(screen.getByLabelText("Categoría")).toHaveValue("cat-1");
  expect(screen.getByText("Página 2 de 2")).toBeVisible();
  expect(screen.getByRole("link", { name: /Sofrito/ })).toHaveFocus();
  expect(
    mock.mock.calls.some(
      ([url]) =>
        String(url).includes("page=2") &&
        String(url).includes("category=cat-1"),
    ),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Limpiar" }));
  await screen.findByText("Página 1 de 2");
  expect(screen.getByLabelText("Buscar recetas")).toHaveValue("");
  expect(screen.getByLabelText("Categoría")).toHaveValue("");
});

it("opens direct recipe links and returns to the list without leaving the app", async () => {
  window.history.replaceState(null, "", "/consulta?receta=recipe-1&q=tomate");
  mockApi();
  const user = userEvent.setup();
  render(<Consultation />);
  await screen.findByRole("heading", { name: "Sofrito", level: 1 });
  await user.click(
    screen.getByRole("button", { name: /Volver a las recetas/ }),
  );
  await screen.findByRole("heading", { name: "Mis recetas" });
  expect(window.location.search).toBe("?q=tomate");
  expect(screen.getByLabelText("Buscar recetas")).toHaveValue("tomate");
});

it("ignores late list responses after changing the search", async () => {
  let resolveOld!: (value: Response) => void;
  const old = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/categories")) return Response.json([]);
      if (url.includes("q=nueva"))
        return Response.json({
          items: [{ ...summary, name: "Nueva receta" }],
          total: 1,
          totalPages: 1,
        });
      return old;
    }),
  );
  const user = userEvent.setup();
  render(<Consultation />);
  await user.type(screen.getByLabelText("Buscar recetas"), "nueva");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await screen.findByRole("link", { name: /Nueva receta/ });
  resolveOld(Response.json(result));
  await waitFor(() =>
    expect(
      screen.queryByRole("link", { name: /Sofrito/ }),
    ).not.toBeInTheDocument(),
  );
});

it("does not show an older detail when navigating while a read is pending", async () => {
  let resolveOld!: (value: Response) => void;
  const old = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).endsWith("recipe-1")
          ? old
          : Response.json({ ...detail, id: "recipe-2", name: "Otra receta" }),
      ),
  );
  const { rerender } = render(<RecipeReader id="recipe-1" onBack={() => {}} />);
  rerender(<RecipeReader id="recipe-2" onBack={() => {}} />);
  await screen.findByRole("heading", { name: "Otra receta", level: 1 });
  resolveOld(Response.json(detail));
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Sofrito" }),
    ).not.toBeInTheDocument(),
  );
});

it("offers a read-only retry after an API error", async () => {
  const mock = mockApi();
  mock.mockImplementation(async (input) =>
    String(input).endsWith("/categories")
      ? Response.json([])
      : Response.json({}, { status: 503 }),
  );
  const user = userEvent.setup();
  render(<Consultation />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudieron consultar",
  );
  mock.mockImplementation(async (input) =>
    Response.json(String(input).endsWith("/categories") ? [] : result),
  );
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByRole("link", { name: /Sofrito/ });
  expect(mock.mock.calls.every(([, init]) => init?.method === "GET")).toBe(
    true,
  );
});

it("handles removed recipes and offline state without promising offline data", async () => {
  mockApi();
  const user = userEvent.setup();
  render(<Consultation />);
  await screen.findByRole("link", { name: /Sofrito/ });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  fireEvent(window, new Event("offline"));
  expect(screen.getByText(/Sin conexión/)).toBeVisible();
  await user.click(screen.getByText("Instalar en Android"));
  expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeVisible();
  const mock = vi.fn().mockResolvedValue(Response.json({}, { status: 404 }));
  vi.stubGlobal("fetch", mock);
  await user.click(screen.getByRole("link", { name: /Sofrito/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "ya no está disponible",
  );
  expect(
    within(screen.getByRole("alert")).getByRole("link", {
      name: "Volver a entrar",
    }),
  ).toHaveAttribute("href", "/consulta");
});
