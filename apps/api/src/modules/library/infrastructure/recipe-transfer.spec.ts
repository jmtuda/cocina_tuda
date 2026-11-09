import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { RecipeService } from '../application/recipe.service.js';
import {
  PrismaRecipeRepository,
  recipeSelect,
} from './prisma-recipe.repository.js';

function setup() {
  const findUnique = vi.fn();
  const prisma = { getDb: () => ({ recipe: { findUnique } }) };
  const repository = new PrismaRecipeRepository(
    prisma as unknown as PrismaService,
  );
  return { repository, findUnique, service: new RecipeService(repository) };
}

describe('bounded recipe transfer', () => {
  it('uses only reference fields to validate planning instead of reading the full recipe', async () => {
    const { service, findUnique } = setup();
    const reference = { id: 'r', name: 'Sopa', status: 'ACTIVE' };
    findUnique.mockResolvedValue(reference);
    expect(await service.findRecipeReference('r')).toEqual(reference);
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'r' },
      select: { id: true, name: true, status: true },
    });
  });

  it('loads only shopping ingredients and preserves exact quantities, zeros and nullable references', async () => {
    const { service, findUnique } = setup();
    findUnique.mockResolvedValue({
      id: 'r',
      name: 'Sopa',
      status: 'ACTIVE',
      servings: 2,
      ingredients: [
        {
          id: 'line-1',
          ingredientId: 'i',
          ingredient: { id: 'i', name: 'Tomate' },
          variantId: 'v',
          variant: { id: 'v', name: 'Chérry' },
          unitId: 'u',
          unit: { id: 'u', name: 'Gramo', abbreviation: 'g' },
          quantity: { toString: () => '0.125' },
          optional: true,
          observations: 'Entero',
        },
        {
          id: 'line-2',
          ingredientId: 'i',
          ingredient: { id: 'i', name: 'Tomate' },
          variantId: null,
          variant: null,
          unitId: null,
          unit: null,
          quantity: { toString: () => '0' },
          optional: false,
          observations: null,
        },
        {
          id: 'line-3',
          ingredientId: 'i',
          ingredient: { id: 'i', name: 'Tomate' },
          variantId: null,
          variant: null,
          unitId: null,
          unit: null,
          quantity: null,
          optional: false,
          observations: null,
        },
      ],
    });
    const snapshot = await service.findShoppingRecipeSnapshot('r');
    expect(snapshot?.ingredients[0]).toEqual({
      id: 'line-1',
      ingredientId: 'i',
      ingredientName: 'Tomate',
      variantId: 'v',
      variantName: 'Chérry',
      quantity: '0.125',
      unitId: 'u',
      unitName: 'Gramo',
      unitAbbreviation: 'g',
      optional: true,
      observations: 'Entero',
    });
    expect(snapshot?.ingredients[1]).toMatchObject({
      quantity: '0',
      variantName: null,
      unitName: null,
    });
    expect(snapshot?.ingredients[2].quantity).toBeNull();
    const { select } = findUnique.mock.calls[0][0] as {
      select: Record<string, unknown>;
    };
    expect(Object.keys(select).sort()).toEqual([
      'id',
      'ingredients',
      'name',
      'servings',
      'status',
    ]);
    expect(select.ingredients).toMatchObject({
      orderBy: { position: 'asc' },
      select: { position: false, quantity: true },
    });
    expect(select.ingredients).toMatchObject({
      select: { ingredient: { select: { id: true, name: true } } },
    });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns null for missing references and only fetches the ID for existence checks', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValue(null);
    expect(await repository.findRecipeReference('missing')).toBeNull();
    expect(await repository.findShoppingRecipeSnapshot('missing')).toBeNull();
    expect(
      await repository.update('missing', {
        name: 'Nada',
        steps: [],
        ingredients: [],
      }),
    ).toBeNull();
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { id: 'missing' },
      select: { id: true },
    });
    expect(await repository.archive('missing')).toBeNull();
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { id: 'missing' },
      select: { id: true },
    });
  });

  it('selects the full public detail without unused relation columns', () => {
    expect(recipeSelect).not.toHaveProperty('normalizedName');
    expect(recipeSelect.steps.select).not.toHaveProperty('recipeId');
    expect(recipeSelect.steps.select.mamboSpeed).toBe(true);
    expect(recipeSelect.ingredients.select.ingredient).toEqual({
      select: { id: true, name: true },
    });
    expect(recipeSelect.categories).toEqual({
      select: { category: { select: { id: true, name: true } } },
    });
  });
});
