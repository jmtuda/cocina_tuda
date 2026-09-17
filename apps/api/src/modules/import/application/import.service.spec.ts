import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogService } from '../../catalog/application/catalog.service.js';
import type { ClassificationService } from '../../catalog/application/classification.service.js';
import type { RecipeService } from '../../library/application/recipe.service.js';
import type { RecipeInterpreter } from './recipe-interpreter.js';
import type { SourceExtractor } from './source-extractor.js';
import type { UnitOfWork } from './unit-of-work.js';
import { ImportService } from './import.service.js';

const raw = {
  name: 'Ensalada',
  description: null,
  author: null,
  servings: 2,
  difficulty: null,
  notes: null,
  steps: ['Mezclar'],
  ingredients: [
    {
      ingredient: 'Tomate',
      variant: 'Chérry',
      quantity: '125.5',
      unit: 'Gramo',
      optional: false,
      observations: null,
    },
    {
      ingredient: 'Tom',
      variant: null,
      quantity: null,
      unit: null,
      optional: true,
      observations: null,
    },
    {
      ingredient: 'Patata',
      variant: null,
      quantity: null,
      unit: null,
      optional: false,
      observations: null,
    },
  ],
  categories: ['Italiana'],
  tags: ['Rápida'],
};

function harness(interpreted: unknown = raw) {
  const interpret = vi.fn(() => Promise.resolve(interpreted as typeof raw));
  const extractor: SourceExtractor = {
    extract: vi.fn(() =>
      Promise.resolve({ kind: 'text' as const, text: 'source' }),
    ),
  };
  const interpreter: RecipeInterpreter = {
    interpret,
  };
  const unitOfWork: UnitOfWork = { run: (work) => work() };
  const catalog = {
    listIngredients: vi.fn(() =>
      Promise.resolve([
        {
          id: 'tomato-id',
          name: 'Tomate',
          normalizedName: 'tomate',
          variants: [
            {
              id: 'cherry-id',
              ingredientId: 'tomato-id',
              name: 'Cherry',
              normalizedName: 'cherry',
            },
          ],
        },
      ]),
    ),
    listUnits: vi.fn(() =>
      Promise.resolve([
        { id: 'gram-id', name: 'Gramo', normalizedName: 'gramo' },
      ]),
    ),
    createIngredient: vi.fn((name: string) =>
      Promise.resolve({ id: `${name}-id` }),
    ),
    createVariant: vi.fn(() => Promise.resolve({ id: 'new-variant-id' })),
    createUnit: vi.fn(() => Promise.resolve({ id: 'new-unit-id' })),
  };
  const classifications = {
    list: vi.fn((kind: 'category' | 'tag') =>
      Promise.resolve(
        kind === 'category'
          ? [
              {
                id: 'category-id',
                name: 'Italiana',
                normalizedName: 'italiana',
              },
            ]
          : [{ id: 'tag-id', name: 'Rápida', normalizedName: 'rapida' }],
      ),
    ),
    create: vi.fn(() => Promise.resolve({ id: 'classification-id' })),
  };
  const recipes = {
    create: vi.fn((input: unknown) =>
      Promise.resolve({ id: 'recipe-id', input }),
    ),
  };
  const service = new ImportService(
    extractor,
    interpreter,
    unitOfWork,
    catalog as unknown as CatalogService,
    classifications as unknown as ClassificationService,
    recipes as unknown as RecipeService,
  );
  return { service, interpret, catalog, classifications, recipes };
}

describe('ImportService', () => {
  it('requires consent before any provider call or definitive write', async () => {
    const { service, interpret, catalog, recipes } = harness();
    await expect(
      service.propose({ kind: 'text', text: 'source' }, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(interpret).not.toHaveBeenCalled();
    expect(catalog.createIngredient).not.toHaveBeenCalled();
    expect(recipes.create).not.toHaveBeenCalled();
  });

  it('resolves exact, ambiguous and new ingredients without persisting', async () => {
    const { service, catalog, recipes } = harness();
    const result = await service.propose(
      { kind: 'text', text: 'source' },
      true,
    );
    expect(
      result.proposal.ingredients.map(
        (item) => item.ingredientResolution.status,
      ),
    ).toEqual(['matched', 'ambiguous', 'new']);
    expect(result.proposal.ingredients[0]?.variantResolution?.status).toBe(
      'matched',
    );
    expect(catalog.createIngredient).not.toHaveBeenCalled();
    expect(recipes.create).not.toHaveBeenCalled();
  });

  it('rejects incomplete or invalid provider structures', async () => {
    const { service } = harness({ name: 'Incomplete' });
    await expect(
      service.propose({ kind: 'text', text: 'source' }, true),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('blocks confirmation while a base ingredient is unresolved', () => {
    const { service } = harness();
    expect(() =>
      service.confirm({
        name: 'Receta',
        steps: [],
        ingredients: [{ ingredient: {}, optional: false }],
        categories: [],
        tags: [],
      }),
    ).toThrow('Cada referencia debe elegir');
  });

  it('confirms approved catalog creations and the recipe through public services', async () => {
    const { service, catalog, classifications, recipes } = harness();
    await service.confirm({
      name: 'Receta importada',
      steps: ['Cocinar'],
      ingredients: [
        {
          ingredient: { createName: 'Patata' },
          unit: { createName: 'Kilogramo', createAbbreviation: 'kg' },
          quantity: '1.5',
          optional: false,
        },
      ],
      categories: [{ createName: 'Casera' }],
      tags: [{ existingId: 'tag-id' }],
    });
    expect(catalog.createIngredient).toHaveBeenCalledWith('Patata');
    expect(catalog.createUnit).toHaveBeenCalledWith('Kilogramo', 'kg');
    expect(classifications.create).toHaveBeenCalledWith('category', 'Casera');
    expect(recipes.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Receta importada' }),
    );
  });
});
