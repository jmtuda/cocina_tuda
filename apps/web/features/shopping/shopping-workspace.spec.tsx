import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShoppingWorkspace } from "./shopping-workspace";

const meal = {
  id: "00000000-0000-4000-8000-000000000001",
  plannedDate: "2026-09-21",
  mealName: "Cena",
  recipe: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Tortilla",
    status: "ACTIVE",
  },
};

const list = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Compra semanal",
  sourceFrom: "2026-09-21",
  sourceTo: "2026-09-27",
  sources: [
    {
      plannedMealId: meal.id,
      recipeName: meal.recipe.name,
      plannedDate: meal.plannedDate,
    },
  ],
  items: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      ingredientId: "00000000-0000-4000-8000-000000000005",
      variantId: null,
      manualName: null,
      quantity: "2",
      unitId: null,
      observations: null,
      optional: false,
      purchased: false,
      ingredient: {
        id: "00000000-0000-4000-8000-000000000005",
        name: "Huevo",
      },
      variant: null,
      unit: null,
      sources: [
        { recipeName: meal.recipe.name, plannedDate: meal.plannedDate },
      ],
    },
  ],
};

const pageOf = (items: unknown[], page = 1, total = items.length) => ({
  items,
  page,
  pageSize: 20,
  total,
  totalPages: Math.ceil(total / 20),
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ShoppingWorkspace", () => {
  it("allows excluding a planned meal before generating a new snapshot", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([]))))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([list]))));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ShoppingWorkspace />);

    const selection = await screen.findByLabelText(
      /2026-09-21 · Cena · Tortilla/,
    );
    await user.click(selection);
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );

    await screen.findByRole("region", { name: "Totales de compra" });
    const request = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body)) as {
      excludedPlannedMealIds: string[];
    };
    expect(request.excludedPlannedMealIds).toEqual([meal.id]);
    await screen.findByText("Página 1 de 1 · 1 listas");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/catalog/units"),
      ),
    ).toHaveLength(1);
  });

  it("keeps a generated list if refreshing metadata fails and retries without generating again", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([]))))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([list]))));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ShoppingWorkspace />);
    await screen.findByText("Listas y planificación cargadas.");
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );
    await screen.findByText(
      /Lista generada\. No se pudo actualizar el listado/,
    );
    expect(
      screen.getByRole("region", { name: "Totales de compra" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Actualizar listas" }));
    await screen.findByText("Listas actualizadas.");
    expect(
      screen.getByRole("button", { name: "Compra semanal" }),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/catalog/units"),
      ),
    ).toHaveLength(1);
  });

  it("adds a free manual item without catalog selection", async () => {
    const manualItem = {
      ...list.items[0],
      id: "00000000-0000-4000-8000-000000000006",
      ingredientId: null,
      ingredient: null,
      manualName: "Papel de cocina",
      quantity: "0",
      sources: [],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([]))))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response(JSON.stringify(pageOf([list]))))
      .mockResolvedValueOnce(new Response(JSON.stringify(manualItem)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ShoppingWorkspace />);
    await screen.findByLabelText(/2026-09-21 · Cena · Tortilla/);
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );
    await user.click(screen.getByText("Editar cantidades y elementos"));
    await user.type(screen.getByLabelText("Nombre"), "Papel de cocina");
    await user.type(screen.getAllByLabelText("Cantidad")[1], "0");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(
      await screen.findByDisplayValue("Papel de cocina"),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    const request = JSON.parse(
      String(fetchMock.mock.calls[5]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      manualName: "Papel de cocina",
      quantity: "0",
      optional: false,
      purchased: false,
    });
    expect(request).not.toHaveProperty("ingredientId");
  });
});

it("updates only saved items, retains other drafts and provenance, and deletes locally without detail reads", async () => {
  const other = {
    ...list.items[0],
    id: "other",
    ingredientId: "other",
    ingredient: { id: "other", name: "Sal" },
    quantity: "0",
  };
  const saved = { ...list, items: [list.items[0], other] };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "PUT")
        return new Response(
          JSON.stringify({
            ...list.items[0],
            quantity: "0.125",
            unitId: "g",
            unit: { id: "g", name: "Gramo", abbreviation: "g" },
          }),
        );
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return new Response(
        JSON.stringify(
          url.includes("/planned-meals?") || url.endsWith("/catalog/units")
            ? []
            : url.endsWith(`/${list.id}`)
              ? saved
              : pageOf([list]),
        ),
      );
    });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  render(<ShoppingWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: "Compra semanal" }),
  );
  await user.click(screen.getByText("Editar cantidades y elementos"));
  const quantities = screen.getAllByLabelText("Cantidad");
  fireEvent.change(quantities[1], { target: { value: "99" } });
  fireEvent.change(quantities[0], { target: { value: "0.125" } });
  const totals = screen.getByRole("region", { name: "Totales de compra" });
  expect(within(totals).getByText("0")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Guardar" })[0]);
  await waitFor(() =>
    expect(within(totals).getByText("0,125 g")).toBeInTheDocument(),
  );
  expect(quantities[1]).toHaveValue("99");
  expect(within(totals).getByText("0")).toBeInTheDocument();
  expect(screen.getAllByText(/Origen: Tortilla/)).toHaveLength(2);
  await user.click(screen.getAllByRole("button", { name: "Retirar" })[0]);
  await waitFor(() =>
    expect(screen.queryByText("Huevo")).not.toBeInTheDocument(),
  );
  expect(
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith(`/${list.id}`) && !init?.method,
    ),
  ).toHaveLength(1);
  cleanup();
  vi.restoreAllMocks();
});

it("keeps saved totals and drafts on failed writes and preserves metadata on failed page requests", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method || url.includes("page=2"))
        return new Response(JSON.stringify({ message: "Error de prueba" }), {
          status: 400,
        });
      return new Response(
        JSON.stringify(
          url.includes("/planned-meals?") || url.endsWith("/catalog/units")
            ? []
            : url.endsWith(`/${list.id}`)
              ? list
              : pageOf([list], 1, 21),
        ),
      );
    });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  render(<ShoppingWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: "Compra semanal" }),
  );
  await user.click(screen.getByText("Editar cantidades y elementos"));
  const quantity = screen.getAllByLabelText("Cantidad")[0];
  fireEvent.change(quantity, { target: { value: "0" } });
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await screen.findByText("No se pudo editar: Error de prueba");
  expect(quantity).toHaveValue("0");
  expect(
    within(screen.getByRole("region", { name: "Totales de compra" })).getByText(
      "2",
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retirar" }));
  await screen.findByText("No se pudo retirar el elemento");
  expect(quantity).toHaveValue("0");
  await user.type(screen.getByLabelText("Nombre"), "Sin guardar");
  await user.click(screen.getByRole("button", { name: "Añadir" }));
  await screen.findByText("No se pudo añadir: Error de prueba");
  expect(screen.getByLabelText("Nombre")).toHaveValue("Sin guardar");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("No se pudieron cargar las listas de compra");
  expect(screen.getByText("Página 1 de 2 · 21 listas")).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/catalog/units"),
    ),
  ).toHaveLength(1);
  cleanup();
  vi.restoreAllMocks();
});

it("navigates summary pages without fetching details or reloading units", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = String(input);
    const second = url.includes("page=2");
    return new Response(
      JSON.stringify(
        url.includes("/shopping-lists?")
          ? pageOf(
              [
                {
                  id: second ? "second" : list.id,
                  name: second ? "Otra compra" : list.name,
                },
              ],
              second ? 2 : 1,
              21,
            )
          : [],
      ),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<ShoppingWorkspace />);
  await screen.findByText("Página 1 de 2 · 21 listas");
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByRole("button", { name: "Otra compra" });
  expect(screen.getByText("Página 2 de 2 · 21 listas")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Anterior" }));
  await screen.findByRole("button", { name: "Compra semanal" });
  expect(fetchMock).toHaveBeenCalledTimes(5);
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/catalog/units"),
    ),
  ).toHaveLength(1);
});

it("opens a concise read-only summary with saved quantities, unknowns and manual items", async () => {
  const saved = {
    ...list,
    items: [
      list.items[0],
      {
        ...list.items[0],
        id: "manual",
        ingredient: null,
        ingredientId: null,
        manualName: "Papel",
        quantity: null,
        optional: true,
        purchased: true,
        observations: "Dos rollos",
        sources: [],
      },
      {
        ...list.items[0],
        id: "zero",
        ingredient: { id: "salt", name: "Sal" },
        ingredientId: "salt",
        quantity: "0",
      },
    ],
  };
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = String(input);
    return new Response(
      JSON.stringify(
        url.includes("/planned-meals?")
          ? []
          : url.endsWith("/catalog/units")
            ? []
            : url.endsWith(`/shopping-lists/${list.id}`)
              ? saved
              : pageOf([saved]),
      ),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<ShoppingWorkspace />);
  await user.click(
    await screen.findByRole("button", { name: "Compra semanal" }),
  );
  const trigger = screen.getByRole("button", { name: "Ver resumen" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Compra semanal" });
  expect(within(dialog).getAllByRole("listitem")).toHaveLength(3);
  expect(within(dialog).getByText("Huevo")).toBeVisible();
  expect(within(dialog).getByText("Sin cantidad")).toBeVisible();
  expect(within(dialog).getByText("0")).toBeVisible();
  expect(
    within(dialog).getByText(/Opcional · Comprado · Dos rollos/),
  ).toBeVisible();
  expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
  expect(fetchMock.mock.calls.every((call) => !call[1]?.method)).toBe(true);
});
