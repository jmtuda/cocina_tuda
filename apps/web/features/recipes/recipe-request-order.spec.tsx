import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("ignores a late filtered response after clearing, including its pagination", async () => {
  let filtered!: (response: Response) => void;
  let clean!: (response: Response) => void;
  let initial = true;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (!url.includes("/recipes?")) return new Response("[]");
      if (initial) {
        initial = false;
        return new Response(JSON.stringify({ items: [], totalPages: 1 }));
      }
      return new Promise<Response>((resolve) => {
        if (url.includes("q=")) filtered = resolve;
        else clean = resolve;
      });
    }),
  );
  const user = userEvent.setup();
  render(<RecipeWorkspace />);
  await screen.findByText("Biblioteca lista.");
  await user.type(screen.getByLabelText("Buscar"), "viejo");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await user.click(screen.getByRole("button", { name: "Borrar filtros" }));
  const result = (name: string, totalPages: number) =>
    new Response(
      JSON.stringify({
        items: [{ id: name, name, status: "ACTIVE", categories: [], tags: [] }],
        totalPages,
      }),
    );
  await act(async () => {
    clean(result("Resultado limpio", 2));
  });
  await act(async () => {
    filtered(result("Resultado antiguo", 9));
  });
  expect(
    screen.getByRole("button", { name: /Resultado limpio/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /Resultado antiguo/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("1 / 2")).toBeVisible();
});
