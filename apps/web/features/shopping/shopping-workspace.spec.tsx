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

describe("ShoppingWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("allows excluding a planned meal before generating a new snapshot", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response(JSON.stringify([list])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));
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
  });

  it("adds a free manual item without catalog selection", async () => {
    const manualItem = {
      ...list.items[0],
      id: "00000000-0000-4000-8000-000000000006",
      ingredientId: null,
      ingredient: null,
      manualName: "Papel de cocina",
      quantity: null,
      sources: [],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response(JSON.stringify([list])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(manualItem)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...list, items: [...list.items, manualItem] }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ShoppingWorkspace />);
    await screen.findByLabelText(/2026-09-21 · Cena · Tortilla/);
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );
    await user.click(screen.getByText("Editar cantidades y elementos"));
    await user.type(screen.getByLabelText("Nombre"), "Papel de cocina");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(
      await screen.findByDisplayValue("Papel de cocina"),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
    const request = JSON.parse(
      String(fetchMock.mock.calls[6]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      manualName: "Papel de cocina",
      optional: false,
      purchased: false,
    });
    expect(request).not.toHaveProperty("ingredientId");
  });
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
              : [saved],
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
