import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportWorkspace } from "./import-workspace";

const proposal = (status: "new" | "ambiguous") => ({
  importId: "00000000-0000-4000-8000-000000000001",
  proposal: {
    name: "Tortilla",
    description: null,
    author: null,
    servings: 2,
    difficulty: null,
    notes: null,
    steps: ["Cocinar"],
    ingredients: [
      {
        ingredient: status === "new" ? "Patata" : "Tom",
        variant: null,
        quantity: "2",
        unit: null,
        optional: false,
        observations: null,
        ingredientResolution: {
          status,
          proposedName: status === "new" ? "Patata" : "Tom",
          suggestions:
            status === "ambiguous"
              ? [{ id: "ingredient-1", name: "Tomate" }]
              : [],
        },
        variantResolution: null,
        unitResolution: null,
      },
    ],
    categories: [],
    tags: [],
    issues: status === "ambiguous" ? ["Ingrediente 1 sin resolver"] : [],
  },
});

function catalogResponses(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: "ingredient-1", name: "Tomate", variants: [] }]),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify([])))
    .mockResolvedValueOnce(new Response(JSON.stringify([])))
    .mockResolvedValueOnce(new Response(JSON.stringify([])));
}

describe("ImportWorkspace", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("requires consent, keeps a local draft and persists only on confirmation", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(proposal("new"))))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "recipe-id", name: "Tortilla" })),
      );
    catalogResponses(fetchMock);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    await user.type(screen.getByLabelText("Texto pegado"), "una receta");
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    expect(screen.getByRole("status")).toHaveTextContent("Debes aceptar");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await user.click(
      screen.getByLabelText(/Confirmo que el contenido de esta fuente/),
    );
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    expect(await screen.findByText("Revisión de la propuesta")).toBeVisible();
    expect(
      window.localStorage.getItem("cocina-tuda-import-draft-v1"),
    ).toContain("Patata");
    expect(fetchMock).toHaveBeenCalledTimes(5);

    await user.click(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10));
    const confirmation = fetchMock.mock.calls[5]?.[1];
    expect(JSON.parse(String(confirmation?.body))).toMatchObject({
      name: "Tortilla",
      ingredients: [
        {
          ingredient: { createName: "Patata" },
          quantity: "2",
          optional: false,
        },
      ],
    });
    expect(
      window.localStorage.getItem("cocina-tuda-import-draft-v1"),
    ).toBeNull();
  });

  it("blocks confirmation until an ambiguous base ingredient is resolved", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(proposal("ambiguous"))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "una receta");
    await user.click(
      screen.getByLabelText(/Confirmo que el contenido de esta fuente/),
    );
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));

    expect(
      await screen.findByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Ingrediente base"),
      "existing:ingredient-1",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeEnabled();
  });
});
