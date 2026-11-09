import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from './catalog.service.js';
import type { CatalogRepository } from './catalog.repository.js';
import { PrismaCatalogRepository } from '../infrastructure/prisma-catalog.repository.js';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

const ingredient = { id: 'i', name: 'Tomate', normalizedName: 'tomate' };
const variant = {
  id: 'v',
  ingredientId: 'i',
  name: 'Cherry',
  normalizedName: 'cherry',
};
const unit = {
  id: 'u',
  name: 'Gramo',
  abbreviation: 'g',
  normalizedName: 'gramo',
};

function harness() {
  const repository = {
    findIngredientById: vi.fn().mockResolvedValue(ingredient),
    findIngredientByNormalizedName: vi.fn().mockResolvedValue(ingredient),
    findVariantById: vi.fn().mockResolvedValue(variant),
    findVariantByNormalizedName: vi.fn().mockResolvedValue(variant),
    findUnitById: vi.fn().mockResolvedValue(unit),
    findUnitByNormalizedName: vi.fn().mockResolvedValue(unit),
    listIngredients: vi.fn(() => {
      throw new Error('Full catalog read');
    }),
    listUnits: vi.fn(() => {
      throw new Error('Full catalog read');
    }),
  };
  return {
    repository,
    service: new CatalogService(repository as unknown as CatalogRepository),
  };
}

describe('targeted catalog references', () => {
  it('loads only selected identities and scopes the variant to its ingredient', async () => {
    const { service, repository } = harness();
    expect(
      await service.findShoppingCatalogReference({
        ingredientId: 'i',
        variantId: 'v',
        unitId: 'u',
      }),
    ).toEqual({
      ingredientId: 'i',
      ingredientName: 'Tomate',
      variantId: 'v',
      variantName: 'Cherry',
      unitId: 'u',
      unitName: 'Gramo',
      unitAbbreviation: 'g',
    });
    expect(repository.findIngredientById).toHaveBeenCalledExactlyOnceWith('i');
    expect(repository.findVariantById).toHaveBeenCalledExactlyOnceWith(
      'i',
      'v',
    );
    expect(repository.findUnitById).toHaveBeenCalledExactlyOnceWith('u');
    expect(repository.listIngredients).not.toHaveBeenCalled();
    expect(repository.listUnits).not.toHaveBeenCalled();
  });

  it.each(['ingredient', 'variant', 'unit'] as const)(
    'rejects a missing or mismatched %s',
    async (kind) => {
      const { service, repository } = harness();
      if (kind === 'ingredient')
        repository.findIngredientById.mockResolvedValue(null);
      if (kind === 'variant')
        repository.findVariantById.mockResolvedValue(null);
      if (kind === 'unit') repository.findUnitById.mockResolvedValue(null);
      expect(
        await service.findShoppingCatalogReference({
          ingredientId: 'i',
          variantId: 'v',
          unitId: 'u',
        }),
      ).toBeNull();
    },
  );

  it('does not query absent optional references and preserves nulls', async () => {
    const { service, repository } = harness();
    expect(
      await service.findShoppingCatalogReference({ ingredientId: 'i' }),
    ).toEqual({
      ingredientId: 'i',
      ingredientName: 'Tomate',
      variantId: null,
      variantName: null,
      unitId: null,
      unitName: null,
      unitAbbreviation: null,
    });
    expect(repository.findVariantById).not.toHaveBeenCalled();
    expect(repository.findUnitById).not.toHaveBeenCalled();
    expect(await service.findShoppingUnitReference('u')).toEqual(unit);
    repository.findUnitById.mockResolvedValue(null);
    expect(await service.findShoppingUnitReference('missing')).toBeNull();
  });

  it('normalizes names through reusable public lookups', async () => {
    const { service, repository } = harness();
    await service.findIngredientByName('  TÓMATE  ');
    await service.findVariantByName('i', '  CHÉRRY  ');
    await service.findUnitByName('  GRÁMO  ');
    expect(
      repository.findIngredientByNormalizedName,
    ).toHaveBeenCalledExactlyOnceWith('tomate');
    expect(
      repository.findVariantByNormalizedName,
    ).toHaveBeenCalledExactlyOnceWith('i', 'cherry');
    expect(repository.findUnitByNormalizedName).toHaveBeenCalledExactlyOnceWith(
      'gramo',
    );
  });

  it('uses unique predicates, narrow projections and the current transaction client', async () => {
    const db = {
      ingredient: { findUnique: vi.fn().mockResolvedValue(ingredient) },
      ingredientVariant: { findUnique: vi.fn().mockResolvedValue(variant) },
      unit: { findUnique: vi.fn().mockResolvedValue(unit) },
    };
    const getDb = vi.fn(() => db);
    const repository = new PrismaCatalogRepository({
      getDb,
    } as unknown as PrismaService);
    expect(await repository.findIngredientById('i')).toEqual(ingredient);
    await repository.findIngredientByNormalizedName('tomate');
    await repository.findVariantById('i', 'v');
    await repository.findVariantByNormalizedName('i', 'cherry');
    await repository.findUnitById('u');
    await repository.findUnitByNormalizedName('gramo');
    const ingredientSelect = { id: true, name: true, normalizedName: true };
    const variantSelect = { ...ingredientSelect, ingredientId: true };
    const unitSelect = { ...ingredientSelect, abbreviation: true };
    expect(db.ingredient.findUnique.mock.calls).toEqual([
      [{ where: { id: 'i' }, select: ingredientSelect }],
      [{ where: { normalizedName: 'tomate' }, select: ingredientSelect }],
    ]);
    expect(db.ingredientVariant.findUnique.mock.calls).toEqual([
      [{ where: { id: 'v', ingredientId: 'i' }, select: variantSelect }],
      [
        {
          where: {
            ingredientId_normalizedName: {
              ingredientId: 'i',
              normalizedName: 'cherry',
            },
          },
          select: variantSelect,
        },
      ],
    ]);
    expect(db.unit.findUnique.mock.calls).toEqual([
      [{ where: { id: 'u' }, select: unitSelect }],
      [{ where: { normalizedName: 'gramo' }, select: unitSelect }],
    ]);
    expect(getDb).toHaveBeenCalledTimes(6);
  });
});
