import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeWorkspace } from "./recipe-workspace";

describe("RecipeWorkspace", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a recipe using catalog references and an exact decimal", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "ingredient-id", name: "Harina" }])),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "unit-id", name: "Gramo", abbreviation: "g" }]),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "recipe-id", status: "ACTIVE" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [], totalPages: 1 })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RecipeWorkspace />);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await screen.findByText("Catálogos actualizados.");
    await user.type(screen.getByLabelText("Nombre"), "Pan casero");
    await user.type(screen.getByLabelText("Primer paso"), "Amasar");
    await user.type(screen.getByLabelText("Cantidad exacta"), "125.5");
    await user.click(screen.getByRole("button", { name: "Crear receta" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    const request = fetchMock.mock.calls[4]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: "Pan casero",
      ingredients: [
        { ingredientId: "ingredient-id", unitId: "unit-id", quantity: "125.5" },
      ],
    });
    expect(
      await screen.findByText(/Receta creada y persistida/),
    ).toBeInTheDocument();
  });
});
