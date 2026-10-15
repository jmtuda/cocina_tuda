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
import {
  MamboEditor,
  MamboSummary,
  mamboDraft,
  mamboPayload,
  validMambo,
} from "./mambo";
import { RecipeWorkspace } from "./recipe-workspace";
import { ImportWorkspace } from "../import/import-workspace";
import { PlanningWorkspace } from "../planning/planning-workspace";
import { useState } from "react";

const config = {
  speed: 0,
  temperature: 100,
  ct: 0,
  durationSeconds: 240,
  observations: "Sin cubilete",
};
const recipe = {
  id: "recipe-1",
  name: "Sofrito",
  status: "ACTIVE",
  categories: [],
  tags: [],
  description: null,
  author: null,
  servings: null,
  difficulty: null,
  notes: null,
  steps: [
    { id: "step-1", position: 0, text: "Sofreír", mambo: config },
    { id: "step-2", position: 1, text: "Servir", mambo: null },
  ],
  ingredients: [],
};
function mockApi() {
  let current = structuredClone(recipe);
  const writes: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.body) {
        const body = JSON.parse(String(init.body));
        writes.push({ url, body });
        if (url.includes("/recipes")) current = { ...current, ...body };
        return new Response(
          JSON.stringify(
            url.includes("/proposals")
              ? {
                  importId: "import-1",
                  proposal: { ...recipe, steps: recipe.steps, issues: [] },
                }
              : current,
          ),
        );
      }
      const result = url.includes("/recipes?")
        ? { items: [current], totalPages: 1 }
        : url.endsWith("/recipes/recipe-1")
          ? current
          : url.includes("/planned-meals?")
            ? [
                {
                  id: "meal-1",
                  recipeId: recipe.id,
                  recipe,
                  plannedDate: "2026-10-15",
                  mealName: "Cena",
                },
              ]
            : [];
      return new Response(JSON.stringify(result));
    });
  vi.stubGlobal("fetch", fetchMock);
  return { writes, fetchMock };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Mambo", () => {
  it("distinguishes zero, empty and absent fields and validates seconds exactly", () => {
    expect(mamboPayload(mamboDraft())).toBeNull();
    expect(
      mamboPayload(mamboDraft({ speed: 0, ct: 0, durationSeconds: 0 })),
    ).toEqual({ speed: 0, ct: 0, durationSeconds: 0 });
    expect(mamboPayload(mamboDraft(config))).toEqual(config);
    expect(mamboDraft({ durationSeconds: 61 }).duration).toBe("61");
    expect(
      validMambo({ ...mamboDraft(), duration: "0.5", durationUnit: "minutes" }),
    ).toBe(true);
    expect(
      validMambo({
        ...mamboDraft(),
        duration: "0.001",
        durationUnit: "minutes",
      }),
    ).toBe(false);
    expect(validMambo({ ...mamboDraft(), speed: "-1" })).toBe(false);
    expect(validMambo({ ...mamboDraft(), speed: "2147483648" })).toBe(false);
    for (let seconds = 0; seconds <= 600; seconds++) {
      const value = {
        ...mamboDraft(),
        duration: String(seconds / 60),
        durationUnit: "minutes" as const,
      };
      expect(validMambo(value)).toBe(true);
      expect(mamboPayload(value)?.durationSeconds).toBe(seconds);
    }
  });

  it("converts the editor duration without changing time, preserves zero and clears fields", async () => {
    function Editor() {
      const [value, setValue] = useState(mamboDraft(config));
      return (
        <>
          <MamboEditor
            step={1}
            value={value}
            onChange={(next) => setValue(next ?? mamboDraft())}
          />
          <output>{JSON.stringify(mamboPayload(value))}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Editor />);
    expect(screen.getByLabelText("Duración Mambo paso 1")).toHaveValue(4);
    await user.selectOptions(
      screen.getByLabelText("Unidad de duración Mambo paso 1"),
      "seconds",
    );
    expect(screen.getByLabelText("Duración Mambo paso 1")).toHaveValue(240);
    await user.clear(screen.getByLabelText("Duración Mambo paso 1"));
    await user.type(screen.getByLabelText("Duración Mambo paso 1"), "31");
    await user.selectOptions(
      screen.getByLabelText("Unidad de duración Mambo paso 1"),
      "minutes",
    );
    await user.selectOptions(
      screen.getByLabelText("Unidad de duración Mambo paso 1"),
      "seconds",
    );
    expect(screen.getByLabelText("Duración Mambo paso 1")).toHaveValue(31);
    await user.clear(screen.getByLabelText("Velocidad Mambo paso 1"));
    expect(
      JSON.parse(screen.getByRole("status").textContent ?? "{}"),
    ).not.toHaveProperty("speed");
  });

  it("hides empty settings and formats compact durations without a conversion button", () => {
    const { rerender, container } = render(<MamboSummary value={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<MamboSummary value={{}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<MamboSummary value={config} />);
    expect(
      screen.getByText("Vel. 0 · 100 °C · CT 0 · 4 m · Sin cubilete"),
    ).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(
      <MamboSummary
        value={{ speed: 1, temperature: 100, ct: 6, durationSeconds: 240 }}
      />,
    );
    expect(screen.getByText("Vel. 1 · 100 °C · CT 6 · 4 m")).toBeVisible();
    expect(
      screen.queryByText(/Mambo:|velocidad|temperatura|tiempo/),
    ).not.toBeInTheDocument();
    for (const [seconds, label] of [
      [90, "1 m 30 s"],
      [60, "1 m"],
      [6, "6 s"],
      [0, "0 s"],
      [3601, "60 m 1 s"],
    ] as const) {
      rerender(<MamboSummary value={{ durationSeconds: seconds }} />);
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it("preserves Mambo editing recipe metadata and step text; removes and adds settings", async () => {
    const { writes } = mockApi();
    const user = userEvent.setup();
    render(<RecipeWorkspace />);
    await user.click(await screen.findByRole("button", { name: /Sofrito/ }));
    expect(screen.getByText(/Vel\. 0/)).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getAllByRole("listitem"),
    ).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.type(screen.getByLabelText("Notas"), "Nueva nota");
    await user.type(screen.getByLabelText("Paso 1"), " despacio");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Receta guardada.");
    expect(writes[0].body.steps).toEqual([
      { position: 0, text: "Sofreír despacio", mambo: config },
      { position: 1, text: "Servir" },
    ]);
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(
      screen.getByRole("button", { name: "Quitar Mambo del paso 1" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Añadir Mambo al paso 2" }),
    );
    await user.type(screen.getByLabelText("Velocidad Mambo paso 2"), "0");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByText("Receta guardada.");
    expect(writes[1].body.steps).toEqual([
      { position: 0, text: "Sofreír despacio" },
      { position: 1, text: "Servir", mambo: { speed: 0 } },
    ]);
  });

  it("creates a recipe with optional Mambo and rejects fractional seconds", async () => {
    const { writes } = mockApi();
    const user = userEvent.setup();
    render(<RecipeWorkspace mode="create" />);
    await screen.findByText("Biblioteca lista.");
    await user.type(screen.getByLabelText("Nombre"), "Nueva");
    await user.click(screen.getByRole("button", { name: "Añadir paso" }));
    await user.type(screen.getByLabelText("Paso 1"), "Cocer");
    await user.click(
      screen.getByRole("button", { name: "Añadir Mambo al paso 1" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Unidad de duración Mambo paso 1"),
      "minutes",
    );
    await user.type(screen.getByLabelText("Duración Mambo paso 1"), "0.001");
    fireEvent.submit(
      screen.getByRole("button", { name: "Crear receta" }).closest("form")!,
    );
    await screen.findByText("Revisa los valores de Mambo antes de guardar.");
    expect(writes).toHaveLength(0);
    await user.clear(screen.getByLabelText("Duración Mambo paso 1"));
    await user.type(screen.getByLabelText("Duración Mambo paso 1"), "4");
    await user.type(screen.getByLabelText("Velocidad Mambo paso 1"), "0");
    await user.click(screen.getByRole("button", { name: "Crear receta" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body.steps).toEqual([
      { position: 0, text: "Cocer", mambo: { speed: 0, durationSeconds: 240 } },
    ]);
  });

  it("reviews imported config, swaps associations without loss and confirms corrected settings", async () => {
    const { writes } = mockApi();
    const user = userEvent.setup();
    render(<ImportWorkspace />);
    await user.type(
      screen.getByLabelText("Texto pegado"),
      "Sofreír. Vel.:1/// Temp.:100/// CT:6/// Tiempo:4m",
    );
    await user.click(screen.getByLabelText(/Confirmo que el contenido/));
    await user.click(screen.getByRole("button", { name: "Crear propuesta" }));
    await screen.findByLabelText("Velocidad Mambo paso 1");
    await user.selectOptions(
      screen.getByLabelText("Asociar Mambo del paso 1 a"),
      "1",
    );
    expect(
      screen.queryByLabelText("Velocidad Mambo paso 1"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Velocidad Mambo paso 2")).toHaveValue(0);
    await user.clear(screen.getByLabelText("CT Mambo paso 2"));
    await user.type(screen.getByLabelText("Paso 2"), " caliente");
    await user.click(
      screen.getByRole("button", { name: "Confirmar y crear receta" }),
    );
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1].body.steps).toEqual([
      "Sofreír",
      {
        text: "Servir caliente",
        mambo: {
          speed: 0,
          temperature: 100,
          durationSeconds: 240,
          observations: "Sin cubilete",
        },
      },
    ]);
  });

  it("shows settings within the planning step, not another numbered item", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    mockApi();
    const user = userEvent.setup();
    render(<PlanningWorkspace />);
    await user.click(
      await screen.findByRole("button", { name: "Consultar receta" }),
    );
    expect(screen.getByText(/Vel\. 0/)).toBeVisible();
    expect(screen.getByText("Sofreír").closest("ol")?.children).toHaveLength(2);
  });
});
