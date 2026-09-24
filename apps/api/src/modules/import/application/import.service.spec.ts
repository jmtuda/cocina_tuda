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
  const confirmed = new Map<string, { id: string }>();
  const unitOfWork: UnitOfWork = {
    run: (work) => work(),
    runIdempotent: async (key, load, work) => {
      const existing = confirmed.get(key);
      if (existing) return load(existing.id);
      const result = await work();
      confirmed.set(key, result);
      return result;
    },
  };
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
    get: vi.fn((id: string) => Promise.resolve({ id, input: 'persisted' })),
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
        importId: '00000000-0000-4000-8000-000000000001',
        name: 'Receta',
        steps: [],
        ingredients: [
          {
            ingredient: {},
            variant: { discarded: true },
            unit: { discarded: true },
            optional: false,
          },
        ],
        categories: [],
        tags: [],
      }),
    ).toThrow('Cada referencia debe resolverse');
  });

  it('confirms approved catalog creations and the recipe through public services', async () => {
    const { service, catalog, classifications, recipes } = harness();
    await service.confirm({
      importId: '00000000-0000-4000-8000-000000000002',
      name: 'Receta importada',
      steps: ['Cocinar'],
      ingredients: [
        {
          ingredient: { createName: 'Patata' },
          variant: { discarded: true },
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

  it('rejects unresolved optional references and accepts explicit discard', async () => {
    const { service, recipes, catalog, classifications } = harness();
    const base = {
      importId: '00000000-0000-4000-8000-000000000003',
      name: 'Receta revisada',
      steps: [],
      ingredients: [
        {
          ingredient: { createName: 'Patata' },
          variant: {},
          unit: { discarded: true },
          optional: false,
        },
      ],
      categories: [{ discarded: true }],
      tags: [{ discarded: true }],
    };
    expect(() => service.confirm(base)).toThrow('debe resolverse');

    await service.confirm({
      ...base,
      ingredients: [
        {
          ...base.ingredients[0],
          variant: { discarded: true },
        },
      ],
    });
    expect(catalog.createVariant).not.toHaveBeenCalled();
    expect(classifications.create).not.toHaveBeenCalled();
    expect(recipes.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: [], tagIds: [] }),
    );
  });

  it('returns the original recipe for a repeated import id', async () => {
    const { service, recipes } = harness();
    const input = {
      importId: '00000000-0000-4000-8000-000000000004',
      name: 'Idempotente',
      steps: [],
      ingredients: [],
      categories: [],
      tags: [],
    };
    const first = await service.confirm(input);
    const repeated = await service.confirm(input);
    expect(first.id).toBe('recipe-id');
    expect(repeated.id).toBe('recipe-id');
    expect(recipes.create).toHaveBeenCalledTimes(1);
    expect(recipes.get).toHaveBeenCalledWith('recipe-id');
  });
});
