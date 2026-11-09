import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { PrismaShoppingRepository } from './prisma-shopping.repository.js';

const stored = {
  id: 'item',
  position: 4,
  ingredientId: 'ingredient',
  variantId: null,
  manualName: null,
  quantity: { toString: () => '0' },
  unitId: 'unit',
  observations: 'snapshot',
  optional: false,
  purchased: true,
  ingredient: { id: 'ingredient', name: 'Sal' },
  variant: null,
  unit: { id: 'unit', name: 'Gramo', abbreviation: 'g' },
  sources: [
    {
      recipeIngredientId: 'use',
      listSource: {
        plannedMealId: 'meal',
        recipeId: 'recipe',
        recipeName: 'Original',
        plannedDate: new Date('2026-09-21T00:00:00Z'),
      },
    },
  ],
};
const input = {
  ingredientId: 'ingredient',
  quantity: '0',
  optional: false,
  purchased: true,
};

function setup() {
  const db = {
    shoppingList: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(41),
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'list', items: [{ position: 3 }] }),
    },
    shoppingItem: {
      findFirst: vi.fn().mockResolvedValue({ id: 'item' }),
      create: vi.fn().mockResolvedValue(stored),
      update: vi.fn().mockResolvedValue(stored),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return {
    db,
    repository: new PrismaShoppingRepository(db as unknown as PrismaService),
  };
}

describe('shopping bounded projections', () => {
  it('pages only list metadata and counts in the database with stable ordering', async () => {
    const { db, repository } = setup();
    expect(await repository.list(2, 20)).toEqual({
      items: [],
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(db.shoppingList.findMany).toHaveBeenCalledExactlyOnceWith({
      skip: 20,
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        sourceFrom: true,
        sourceTo: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(db.shoppingList.count).toHaveBeenCalledExactlyOnceWith();
    db.shoppingList.count.mockResolvedValueOnce(0);
    expect(await repository.list(3, 10)).toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
    });
  });

  it('reads only the next position and returns one projected item including zero and provenance', async () => {
    const { db, repository } = setup();
    expect(await repository.addItem('list', input)).toMatchObject({
      quantity: '0',
      unit: stored.unit,
      sources: [
        {
          recipeName: 'Original',
          plannedDate: '2026-09-21',
          recipeIngredientId: 'use',
        },
      ],
    });
    expect(db.shoppingList.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'list' },
      select: {
        id: true,
        items: {
          orderBy: { position: 'desc' },
          take: 1,
          select: { position: true },
        },
      },
    });
    const query: unknown = db.shoppingItem.create.mock.calls[0]?.[0];
    expect(query).not.toHaveProperty('include');
    expect(query).toHaveProperty('select.ingredient', {
      select: { id: true, name: true },
    });
    expect(query).toHaveProperty('select.unit', {
      select: { id: true, name: true, abbreviation: true },
    });
    expect(query).toHaveProperty('select.sources.select.listSource.select', {
      plannedMealId: true,
      recipeId: true,
      recipeName: true,
      plannedDate: true,
    });
  });

  it('checks ownership with id only, preserves exact decimals and does not read a list after editing/deleting', async () => {
    const { db, repository } = setup();
    db.shoppingItem.update.mockResolvedValueOnce({
      ...stored,
      quantity: { toString: () => '123456789.125' },
    });
    expect(await repository.updateItem('list', 'item', input)).toMatchObject({
      quantity: '123456789.125',
    });
    expect(db.shoppingItem.findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'item', shoppingListId: 'list' },
      select: { id: true },
    });
    expect(await repository.deleteItem('list', 'item')).toBe(true);
    expect(db.shoppingList.findUnique).not.toHaveBeenCalled();
    db.shoppingItem.findFirst.mockResolvedValueOnce(null);
    expect(await repository.updateItem('other', 'item', input)).toBeNull();
    expect(db.shoppingItem.update).toHaveBeenCalledTimes(1);
  });
});
