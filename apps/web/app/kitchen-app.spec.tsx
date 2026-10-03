import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KitchenApp } from "./kitchen-app";

describe("KitchenApp", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("navigates between one workspace at a time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/recipes?")) {
          return new Response(JSON.stringify({ items: [], totalPages: 1 }));
        }
        if (url.endsWith("/health")) {
          return new Response(JSON.stringify({ status: "ok" }));
        }
        return new Response(JSON.stringify([]));
      }),
    );
    const user = userEvent.setup();
    render(<KitchenApp />);

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Biblioteca de recetas" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Plan semanal" }));
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Plan semanal" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Biblioteca de recetas" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear error when the backend is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")),
    );
    render(<KitchenApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Los cambios no se guardarán",
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "No se puede conectar",
      ),
    );
  });
});
