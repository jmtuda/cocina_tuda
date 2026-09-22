import { describe, expect, it } from 'vitest';
import {
  consolidateContributions,
  type ShoppingContribution,
} from './shopping.js';

const contribution = (
  overrides: Partial<ShoppingContribution> = {},
): ShoppingContribution => ({
  plannedMealId: 'meal-1',
  recipeId: 'recipe-1',
  recipeIngredientId: 'use-1',
  ingredientId: 'flour',
  ingredientName: 'Harina',
  variantId: null,
  variantName: null,
  quantity: '0.1',
  unitId: 'gram',
  unitName: 'Gramo',
  unitAbbreviation: 'g',
  optional: false,
  observations: null,
  ...overrides,
});

describe('shopping consolidation', () => {
  it('sums compatible exact decimals from repeated recipes and uses', () => {
    const result = consolidateContributions([
      contribution(),
      contribution({
        plannedMealId: 'meal-2',
        recipeIngredientId: 'use-2',
        quantity: '0.2',
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quantity: '0.3' });
    expect(result[0]?.sources).toHaveLength(2);
  });

  it('keeps different units, variants and base ingredients separate', () => {
    const result = consolidateContributions([
      contribution(),
      contribution({ unitId: 'kg', unitName: 'Kilogramo' }),
      contribution({ variantId: 'wholemeal', variantName: 'Integral' }),
    ]);
    expect(result).toHaveLength(3);
  });

  it('keeps known, unknown, optional and required quantities separate', () => {
    const result = consolidateContributions([
      contribution({ quantity: '2' }),
      contribution({ quantity: null, recipeIngredientId: 'use-2' }),
      contribution({
        quantity: '1',
        optional: true,
        recipeIngredientId: 'use-3',
      }),
    ]);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.quantity)).toEqual(['2', null, '1']);
  });

  it('deduplicates only exact observation text without rewriting it', () => {
    const result = consolidateContributions([
      contribution({ observations: 'Tamizada' }),
      contribution({
        plannedMealId: 'meal-2',
        recipeIngredientId: 'use-2',
        observations: 'Tamizada',
      }),
      contribution({
        plannedMealId: 'meal-3',
        recipeIngredientId: 'use-3',
        observations: 'Para espolvorear',
      }),
    ]);
    expect(result[0]?.observations).toBe('Tamizada\nPara espolvorear');
  });
});
