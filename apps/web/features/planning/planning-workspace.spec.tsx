import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addCalendarDays,
  calendarWeek,
  PlanningWorkspace,
  startOfCalendarWeek,
} from "./planning-workspace";

describe("calendar date helpers", () => {
  it("navigates exact calendar weeks without local timezone shifts", () => {
    expect(startOfCalendarWeek("2026-09-21")).toBe("2026-09-21");
    expect(startOfCalendarWeek("2026-09-27")).toBe("2026-09-21");
    expect(addCalendarDays("2026-09-21", 7)).toBe("2026-09-28");
    expect(calendarWeek("2026-09-21")).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });
});

describe("PlanningWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows empty days and navigates to adjacent weeks", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: "recipe-1", name: "Tortilla", status: "ACTIVE" }],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<PlanningWorkspace />);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(await screen.findAllByText("Día vacío")).toHaveLength(7);
    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(String(fetchMock.mock.calls[2]?.[0])).toMatch(
      /planned-meals\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/,
    );
  });

  it("creates and permanently removes a planned meal", async () => {
    const recipe = { id: "recipe-1", name: "Tortilla", status: "ACTIVE" };
    const meal = {
      id: "meal-1",
      recipeId: recipe.id,
      plannedDate: "2026-09-21",
      mealName: "Cena",
      recipe,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [recipe] })))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(meal)))
      .mockResolvedValueOnce(new Response(JSON.stringify([meal])))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<PlanningWorkspace />);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await user.selectOptions(
      screen.getByLabelText("Receta activa"),
      "recipe-1",
    );
    await user.clear(screen.getByLabelText("Fecha"));
    await user.type(screen.getByLabelText("Fecha"), "2026-09-21");
    await user.type(screen.getByLabelText("Denominación opcional"), "Cena");
    await user.click(screen.getByRole("button", { name: "Añadir al plan" }));
    expect(await screen.findAllByText("Tortilla")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Retirar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("DELETE");
  });
});
