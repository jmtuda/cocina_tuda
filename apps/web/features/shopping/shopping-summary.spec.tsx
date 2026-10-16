import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  aggregateShoppingItems,
  ShoppingSummary,
  type SummaryItem,
} from "./shopping-summary";
const item = (change: Partial<SummaryItem> = {}): SummaryItem => ({
  id: "1",
  ingredientId: "potato",
  variantId: null,
  manualName: null,
  quantity: "1",
  unitId: "ud",
  optional: false,
  purchased: false,
  observations: null,
  ingredient: { id: "potato", name: "Patata" },
  variant: null,
  unit: { id: "ud", name: "unidad", abbreviation: "ud" },
  ...change,
});
afterEach(cleanup);
it("adds potato quantities across recipes and stored rows without changing the inputs", () => {
  const rows = [item(), item({ id: "2", quantity: "2" })];
  const original = structuredClone(rows);
  expect(aggregateShoppingItems(rows)).toMatchObject([
    { name: "Patata", quantity: "3 ud" },
  ]);
  expect(rows).toEqual(original);
});
it("adds exact decimals and equivalent metric and count units", () => {
  expect(
    aggregateShoppingItems([
      item({
        unitId: "l",
        unit: { id: "l", name: "litro", abbreviation: "l" },
      }),
      item({
        id: "2",
        quantity: "300",
        unitId: "ml",
        unit: { id: "ml", name: "mililitros", abbreviation: "ml" },
      }),
    ])[0]?.quantity,
  ).toBe("1,3 l");
  expect(
    aggregateShoppingItems([
      item({
        quantity: "0.5",
        unitId: "kg",
        unit: { id: "kg", name: "Kilogramo", abbreviation: "kg" },
      }),
      item({
        id: "2",
        quantity: "250",
        unitId: "g",
        unit: { id: "g", name: "Gramos", abbreviation: "gr" },
      }),
    ])[0]?.quantity,
  ).toBe("750 g");
  expect(
    aggregateShoppingItems([
      item({
        quantity: "0.1",
        unitId: "g",
        unit: { id: "g", name: "Gramo", abbreviation: "g" },
      }),
      item({
        id: "2",
        quantity: "0.2",
        unitId: "gr",
        unit: { id: "gr", name: "gramos", abbreviation: "gr" },
      }),
    ])[0]?.quantity,
  ).toBe("0,3 g");
  expect(
    aggregateShoppingItems([
      item(),
      item({
        id: "2",
        quantity: "2",
        unitId: "unit2",
        unit: { id: "unit2", name: "Unidades", abbreviation: "uds" },
      }),
    ])[0]?.quantity,
  ).toBe("3 ud");
});
it("retains incompatible measures and unknown additional quantities in one ingredient row", () => {
  const result = aggregateShoppingItems([
    item({
      quantity: "2",
      unitId: "casco",
      unit: { id: "casco", name: "casco", abbreviation: "casco" },
    }),
    item({ id: "2", quantity: "0.75" }),
    item({ id: "3", quantity: null, unitId: null, unit: null }),
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]?.quantity).toBe("2 casco + 0,75 ud + Sin cantidad");
});
it("preserves variant distinctions, mixed purchase/optional status and notes", () => {
  const result = aggregateShoppingItems([
    item({ purchased: true, optional: true, observations: "Con piel" }),
    item({ id: "2", observations: "Con piel" }),
    item({ id: "3", variantId: "red", variant: { id: "red", name: "Roja" } }),
  ]);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    quantity: "2 ud",
    notes: "Incluye opcionales · Parcialmente comprado · Con piel",
    purchased: false,
  });
  expect(result[1]?.variant).toBe("Roja");
});
it("keeps zero and manual items, and shows an empty list", () => {
  const result = aggregateShoppingItems([
    item({ quantity: "0" }),
    item({
      id: "free",
      ingredientId: null,
      ingredient: null,
      manualName: "Papel",
      quantity: null,
      unitId: null,
      unit: null,
    }),
  ]);
  expect(result.map((r) => r.quantity)).toEqual(["Sin cantidad", "0 ud"]);
  render(<ShoppingSummary items={[]} compact />);
  expect(screen.getByText("La lista está vacía.")).toBeVisible();
});
it("does not round away precise metric conversions", () => {
  expect(
    aggregateShoppingItems([
      item({
        quantity: "1",
        unitId: "kg",
        unit: { id: "kg", name: "kg", abbreviation: "kg" },
      }),
      item({
        id: "2",
        quantity: "0.125",
        unitId: "g",
        unit: { id: "g", name: "g", abbreviation: "g" },
      }),
    ])[0]?.quantity,
  ).toBe("1,000125 kg");
});
