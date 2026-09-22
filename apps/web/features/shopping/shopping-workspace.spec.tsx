import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
      .mockResolvedValueOnce(new Response(JSON.stringify(list)))
      .mockResolvedValueOnce(new Response(JSON.stringify([list])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ShoppingWorkspace />);

    await user.click(
      screen.getByRole("button", { name: "Consultar intervalo" }),
    );
    const selection = await screen.findByLabelText(
      /2026-09-21 · Cena · Tortilla/,
    );
    await user.click(selection);
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );

    await screen.findByText("Huevo");
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
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
    await user.click(
      screen.getByRole("button", { name: "Consultar intervalo" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Generar nueva lista" }),
    );
    await user.type(screen.getByLabelText("Nombre"), "Papel de cocina");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(
      await screen.findByDisplayValue("Papel de cocina"),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    const request = JSON.parse(
      String(fetchMock.mock.calls[4]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      manualName: "Papel de cocina",
      optional: false,
      purchased: false,
    });
    expect(request).not.toHaveProperty("ingredientId");
  });
});
