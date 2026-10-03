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

const ambiguousReferencesProposal = {
  importId: "00000000-0000-4000-8000-000000000009",
  proposal: {
    ...proposal("new").proposal,
    ingredients: [
      {
        ingredient: "Tomate",
        variant: "Cher",
        quantity: "2",
        unit: "Gr",
        optional: false,
        observations: null,
        ingredientResolution: {
          status: "matched",
          existingId: "ingredient-1",
          suggestions: [{ id: "ingredient-1", name: "Tomate" }],
        },
        variantResolution: {
          status: "ambiguous",
          proposedName: "Cher",
          suggestions: [{ id: "variant-1", name: "Chérry" }],
        },
        unitResolution: {
          status: "ambiguous",
          proposedName: "Gr",
          suggestions: [{ id: "unit-1", name: "Gramo" }],
        },
      },
    ],
    categories: [
      {
        name: "Ital",
        resolution: {
          status: "ambiguous",
          proposedName: "Ital",
          suggestions: [{ id: "category-1", name: "Italiana" }],
        },
      },
    ],
    tags: [
      {
        name: "Rap",
        resolution: {
          status: "ambiguous",
          proposedName: "Rap",
          suggestions: [{ id: "tag-1", name: "Rápida" }],
        },
      },
    ],
    issues: [],
  },
};

function richCatalogResponses(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "ingredient-1",
            name: "Tomate",
            variants: [
              {
                id: "variant-1",
                ingredientId: "ingredient-1",
                name: "Chérry",
              },
            ],
          },
        ]),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: "unit-1", name: "Gramo", abbreviation: "g" }]),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "category-1", name: "Italiana" }])),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "tag-1", name: "Rápida" }])),
    );
}

describe("ImportWorkspace", () => {
  it("marks required fields and explains every pending action until explicit approval makes the recipe ready", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    const result = proposal("new");
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...result,
          proposal: {
            ...result.proposal,
            name: null,
            ingredients: [
              {
                ...result.proposal.ingredients[0],
                unitResolution: {
                  status: "new",
                  proposedName: "Manojo",
                  suggestions: [],
                },
              },
            ],
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "receta");
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    const confirm = await screen.findByRole("button", {
      name: "Confirmar y crear receta",
    });
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/\* Obligatorio/)).toBeVisible();
    expect(screen.getByText("Nombre *")).toBeVisible();
    expect(screen.getByText("Ingrediente base *")).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toBeRequired();
    expect(screen.getByLabelText("Ingrediente base")).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByLabelText("Ingrediente base")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Raciones")).not.toBeRequired();
    expect(screen.getByRole("status")).toHaveTextContent(
      "3 acciones pendientes",
    );
    await user.click(screen.getByRole("link", { name: /Ver qué falta/ }));
    const name = screen.getByLabelText("Nombre");
    name.scrollIntoView = vi.fn();
    await user.click(screen.getByRole("link", { name: "Nombre obligatorio." }));
    expect(name).toHaveFocus();
    await user.type(name, "Receta revisada");
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 acciones pendientes",
    );
    expect(
      screen.queryByRole("link", { name: "Nombre obligatorio." }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Revisar creación de Patata" }),
    );
    expect(
      screen.getByLabelText("Ingrediente base nuevo nombre"),
    ).toBeRequired();
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("button", {
        name: "Aprobar creación de ingrediente base",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 acción pendiente");
    expect(
      screen.queryByLabelText("Ingrediente base nuevo nombre"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Revisar creación de Manojo" }),
    );
    expect(screen.getByLabelText("Unidad abreviatura")).toBeRequired();
    expect(
      screen.getByRole("link", { name: /Unidad 1: Completa la abreviatura/ }),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Unidad abreviatura"), "man");
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de unidad" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Lista para guardar");
    expect(confirm).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("explains invalid optional values without making them mandatory", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(proposal("ambiguous"))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "receta");
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    await screen.findByRole("button", { name: "Confirmar y crear receta" });
    await user.selectOptions(
      screen.getByLabelText("Ingrediente base"),
      "existing:ingredient-1",
    );
    const quantity = screen.getByLabelText("Cantidad");
    await user.clear(quantity);
    await user.type(quantity, "1/2");
    const servings = screen.getByLabelText("Raciones");
    await user.clear(servings);
    await user.type(servings, "0");
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 acciones pendientes",
    );
    await user.click(screen.getByRole("link", { name: /Ver qué falta/ }));
    expect(screen.getByRole("link", { name: /Cantidad 1:/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Raciones:/ })).toBeVisible();
    await user.clear(quantity);
    await user.clear(servings);
    expect(screen.getByRole("status")).toHaveTextContent("Lista para guardar");
  });

  it("retains review after a server collision and reloads the catalog for explicit resolution", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(proposal("new"))),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message:
            "Ya existe ingrediente «Patata». Resuelve explícitamente contra el catálogo existente.",
        }),
        { status: 409 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: "potato-id", name: "Patata", variants: [] }]),
      ),
    );
    for (let i = 0; i < 3; i++)
      fetchMock.mockResolvedValueOnce(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "receta");
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    await user.click(
      await screen.findByRole("button", { name: "Revisar creación de Patata" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Aprobar creación de ingrediente base",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Resuelve explícitamente",
      ),
    );
    expect(screen.getByLabelText("Nombre")).toHaveValue("Tortilla");
    expect(
      window.localStorage.getItem("cocina-tuda-import-draft-v2"),
    ).toContain("Patata");
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Ingrediente base"),
      "existing:potato-id",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeEnabled();
  });

  it("shows detected names, approves edited creations and invalidates approval after edits", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    richCatalogResponses(fetchMock);
    const proposed = {
      ...ambiguousReferencesProposal,
      proposal: {
        ...ambiguousReferencesProposal.proposal,
        ingredients: [
          {
            ...ambiguousReferencesProposal.proposal.ingredients[0],
            variantResolution: {
              status: "new",
              proposedName: "Kumato",
              suggestions: [],
            },
            unitResolution: {
              status: "new",
              proposedName: "Manojo",
              suggestions: [],
            },
          },
        ],
        categories: [],
        tags: [],
      },
    };
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(proposed)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Tortilla" })),
      );
    richCatalogResponses(fetchMock);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "receta");
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    await screen.findByRole("button", { name: "Revisar creación de Kumato" });
    expect(
      screen.getByText("Variante de:", { exact: false }),
    ).toHaveTextContent("Tomate");
    await user.click(
      screen.getByRole("button", { name: "Revisar creación de Kumato" }),
    );
    const variantName = screen.getByLabelText("Variante nuevo nombre");
    await user.clear(variantName);
    await user.type(variantName, "Kumato revisado");
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de variante" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Revisar creación de Manojo" }),
    );
    await user.type(screen.getByLabelText("Unidad abreviatura"), "man");
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de unidad" }),
    );
    const confirm = screen.getByRole("button", {
      name: "Confirmar y crear receta",
    });
    expect(confirm).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Modificar variante" }),
    );
    await user.type(
      screen.getByLabelText("Variante nuevo nombre"),
      " especial",
    );
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de variante" }),
    );
    await user.click(confirm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10));
    expect(
      JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body)),
    ).toMatchObject({
      ingredients: [
        {
          ingredient: { existingId: "ingredient-1" },
          variant: { createName: "Kumato revisado especial" },
          unit: { createName: "Manojo", createAbbreviation: "man" },
        },
      ],
    });
  });

  it("blocks normalized collisions until the user selects the existing entity", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(proposal("new"))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(screen.getByLabelText("Texto pegado"), "receta");
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    await user.click(
      await screen.findByRole("button", { name: "Revisar creación de Patata" }),
    );
    const name = screen.getByLabelText("Ingrediente base nuevo nombre");
    await user.clear(name);
    await user.type(name, "  TÓMATE  ");
    expect(screen.getByText(/Ya existe «Tomate»/)).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Aprobar creación de ingrediente base",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Ingrediente base"),
      "existing:ingredient-1",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeEnabled();
    expect(screen.getByRole("option", { name: "Tomate" })).toBeVisible();
  });

  it("requires variant reapproval when its base changes", async () => {
    window.localStorage.setItem(
      "cocina-tuda-import-draft-v2",
      JSON.stringify({
        ...proposal("new").proposal,
        importId: proposal("new").importId,
        servings: "2",
        description: "",
        author: "",
        difficulty: "",
        notes: "",
        categories: [],
        tags: [],
        ingredients: [
          {
            ingredient: {
              mode: "new",
              createName: "Pak choi",
              existingId: "",
              createAbbreviation: "",
              approved: true,
            },
            variant: {
              mode: "new",
              createName: "Baby",
              existingId: "",
              createAbbreviation: "",
              approved: true,
            },
            unit: {
              mode: "discarded",
              createName: "",
              existingId: "",
              createAbbreviation: "",
            },
            quantity: "1",
            optional: false,
            observations: "",
          },
        ],
      }),
    );
    const fetchMock = vi.fn<typeof fetch>();
    catalogResponses(fetchMock);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeEnabled();
    await user.selectOptions(
      screen.getByLabelText("Ingrediente base"),
      "existing:ingredient-1",
    );
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Variante de:", { exact: false }),
    ).toHaveTextContent("Tomate");
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de variante" }),
    );
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeEnabled();
  });

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
      window.localStorage.getItem("cocina-tuda-import-draft-v2"),
    ).toContain("Patata");
    expect(fetchMock).toHaveBeenCalledTimes(5);

    await user.selectOptions(screen.getByLabelText("Ingrediente base"), "new");
    expect(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", {
        name: "Aprobar creación de ingrediente base",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10));
    const confirmation = fetchMock.mock.calls[5]?.[1];
    expect(JSON.parse(String(confirmation?.body))).toMatchObject({
      importId: "00000000-0000-4000-8000-000000000001",
      name: "Tortilla",
      ingredients: [
        {
          ingredient: { createName: "Patata" },
          variant: { discarded: true },
          unit: { discarded: true },
          quantity: "2",
          optional: false,
        },
      ],
    });
    expect(
      window.localStorage.getItem("cocina-tuda-import-draft-v2"),
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

  it("keeps variant, unit, category and tag ambiguities pending until explicit resolution or discard", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    richCatalogResponses(fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(ambiguousReferencesProposal)),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "recipe-id", name: "Tortilla" })),
      );
    richCatalogResponses(fetchMock);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    await user.type(screen.getByLabelText("Texto pegado"), "una receta");
    await user.click(
      screen.getByLabelText(/Confirmo que el contenido de esta fuente/),
    );
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));

    const confirm = await screen.findByRole("button", {
      name: "Confirmar y crear receta",
    });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "4 acciones pendientes",
    );

    await user.selectOptions(
      screen.getByLabelText("Variante"),
      "existing:variant-1",
    );
    await user.selectOptions(screen.getByLabelText("Unidad"), "discarded");
    await user.selectOptions(screen.getByLabelText("Categorías 1"), "new");
    await user.click(
      screen.getByRole("button", { name: "Aprobar creación de categorías 1" }),
    );
    await user.selectOptions(screen.getByLabelText("Etiquetas 1"), "discarded");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(10));

    const body = JSON.parse(
      String(fetchMock.mock.calls[5]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      importId: ambiguousReferencesProposal.importId,
      ingredients: [
        {
          variant: { existingId: "variant-1" },
          unit: { discarded: true },
        },
      ],
      categories: [{ createName: "Ital" }],
      tags: [{ discarded: true }],
    });
  });
});
