import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it.each([false, true])(
  "keeps the created identity and retries only GET before PATCH (reload failure: %s)",
  async (refreshFails) => {
    let finish!: (response: Response) => void;
    let failRefresh = false;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input, init) => {
        if (init?.method === "POST")
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        if (init?.method === "PATCH")
          return new Response(JSON.stringify({ id: "created" }));
        if (failRefresh) return new Response("{}", { status: 503 });
        return new Response(
          String(input).includes("/recipes?")
            ? JSON.stringify({ items: [], totalPages: 1 })
            : "[]",
        );
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace mode="create" />);
    await screen.findByText("Biblioteca lista.");
    await user.type(screen.getByLabelText("Nombre"), "Borrador");
    await user.click(
      screen.getByRole("button", { name: "Gestionar catálogos" }),
    );
    await user.type(screen.getByLabelText("Nombre de catálogo"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
    expect(screen.getByLabelText("Tipo")).toBeDisabled();
    expect(screen.getByLabelText("Acción")).toBeDisabled();
    expect(screen.getByLabelText("Nombre de catálogo")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Cerrar catálogos" }),
    ).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("Nombre de catálogo")).toBeInTheDocument();
    failRefresh = refreshFails;
    await act(async () => {
      finish(new Response(JSON.stringify({ id: "created", name: "Nuevo" })));
    });
    await screen.findByText(
      refreshFails ? /guardado.*recargar/i : "Catálogo guardado.",
    );
    expect(screen.getByLabelText("Acción")).toHaveValue("edit");
    expect(screen.getByLabelText("Elemento")).toHaveValue("created");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Borrador");
    if (refreshFails) {
      expect(
        screen.getByRole("button", { name: "Guardar catálogo" }),
      ).toBeDisabled();
      const before = fetchMock.mock.calls.length;
      failRefresh = false;
      await user.click(
        screen.getByRole("button", { name: "Reintentar recarga" }),
      );
      await screen.findByText("Catálogo guardado.");
      expect(
        fetchMock.mock.calls.slice(before).every((call) => !call[1]?.method),
      ).toBe(true);
    }
    await user.click(screen.getByRole("button", { name: "Guardar catálogo" }));
    await screen.findByText("Catálogo guardado.");
    expect(
      fetchMock.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.find((call) => call[1]?.method === "PATCH")?.[0],
    ).toBe("/api/v1/catalog/ingredients/created");
  },
);
