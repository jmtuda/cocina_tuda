import { describe, it, expect, vi } from 'vitest';
import { CatalogService } from './catalog.service.js';
import type { CatalogRepository } from './catalog.repository.js';
import { PrismaCatalogRepository } from '../infrastructure/prisma-catalog.repository.js';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

describe('catalog updates without replacing identities', () => {
  const make = () => {
    const repository = {
      updateIngredient: vi.fn(),
      updateVariant: vi.fn(),
      updateUnit: vi.fn(),
    };
    return {
      repository,
      service: new CatalogService(repository as unknown as CatalogRepository),
    };
  };
  it.each(['ingredient', 'variant', 'unit'] as const)(
    'normalizes and persists %s with original scope',
    async (kind) => {
      const { service, repository } = make();
      if (kind === 'ingredient') {
        repository.updateIngredient.mockResolvedValue({ id: 'i' });
        expect(await service.updateIngredient('i', '  TOMÁTE  ')).toEqual({
          id: 'i',
        });
        expect(repository.updateIngredient).toHaveBeenCalledWith(
          'i',
          'TOMÁTE',
          'tomate',
        );
      } else if (kind === 'variant') {
        await service.updateVariant('i', 'v', '  Chérry ');
        expect(repository.updateVariant).toHaveBeenCalledWith(
          'i',
          'v',
          'Chérry',
          'cherry',
        );
      } else {
        await service.updateUnit('u', ' Grámo ', ' g ');
        expect(repository.updateUnit).toHaveBeenCalledWith(
          'u',
          'Grámo',
          'g',
          'gramo',
        );
        await expect(
          service.updateUnit('u', 'Gramo', ' '),
        ).rejects.toMatchObject({ status: 400 });
      }
    },
  );
  it.each(['P2002', 'P2025'])('maps %s for every update', async (code) => {
    const { service, repository } = make();
    Object.values(repository).forEach((fn) => fn.mockRejectedValue({ code }));
    const status = code === 'P2002' ? 409 : 404;
    await expect(service.updateIngredient('i', 'Tomate')).rejects.toMatchObject(
      { status },
    );
    await expect(
      service.updateVariant('i', 'v', 'Cherry'),
    ).rejects.toMatchObject({ status });
    await expect(service.updateUnit('u', 'Gramo', 'g')).rejects.toMatchObject({
      status,
    });
  });
  it('updates Prisma by identity and scopes variants without reassigning their ingredient', async () => {
    const db = {
      ingredient: { update: vi.fn() },
      ingredientVariant: { update: vi.fn() },
      unit: { update: vi.fn() },
    };
    const repository = new PrismaCatalogRepository({
      getDb: () => db,
    } as unknown as PrismaService);
    await repository.updateIngredient('i', 'Tomate', 'tomate');
    await repository.updateVariant('i', 'v', 'Cherry', 'cherry');
    await repository.updateUnit('u', 'Gramo', 'g', 'gramo');
    expect(db.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'i' },
        data: { name: 'Tomate', normalizedName: 'tomate' },
      }),
    );
    expect(db.ingredientVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v', ingredientId: 'i' },
        data: { name: 'Cherry', normalizedName: 'cherry' },
      }),
    );
    expect(db.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u' },
        data: { name: 'Gramo', abbreviation: 'g', normalizedName: 'gramo' },
      }),
    );
  });
});
