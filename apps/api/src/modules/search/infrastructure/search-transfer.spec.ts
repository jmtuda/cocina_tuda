import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { RecipeSearchQuery } from '../application/search.repository.js';
import {
  PrismaSearchRepository,
  summarySelect,
} from './prisma-search.repository.js';

const query: RecipeSearchQuery = {
  page: 1,
  pageSize: 20,
  statuses: ['ACTIVE'],
  categoryIds: [],
  tagIds: [],
  text: '',
  ingredientIds: [],
  variantIds: [],
};

describe('summary query projections', () => {
  it.each(['', 'sopa'])(
    'selects only summary columns for search %j',
    async (text) => {
      const summary = {
        id: 'r',
        name: 'Sopa',
        description: null,
        reviewed: false,
        status: 'ACTIVE',
        categories: [{ category: { id: 'c', name: 'Sopas' } }],
        tags: [],
      };
      const findMany = vi.fn().mockResolvedValue([summary]);
      const prisma = {
        recipe: { findMany, count: vi.fn().mockResolvedValue(1) },
        $transaction: (operations: Array<Promise<unknown>>) =>
          Promise.all(operations),
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'r', total: 1n }]),
      };
      const repository = new PrismaSearchRepository(
        prisma as unknown as PrismaService,
      );
      const result = await repository.search({ ...query, text });
      expect(result).toMatchObject({
        total: 1,
        page: 1,
        totalPages: 1,
        items: [
          {
            id: 'r',
            reviewed: false,
            categories: [{ id: 'c', name: 'Sopas' }],
          },
        ],
      });
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0][0]).toMatchObject({
        select: summarySelect,
      });
      expect(findMany.mock.calls[0][0]).not.toHaveProperty('include');
      expect(Object.keys(summarySelect).sort()).toEqual([
        'categories',
        'description',
        'id',
        'name',
        'reviewed',
        'status',
        'tags',
      ]);
      expect(summarySelect.categories).toEqual({
        select: { category: { select: { id: true, name: true } } },
      });
      if (!text)
        expect(findMany.mock.calls[0][0]).toMatchObject({ take: 20, skip: 0 });
    },
  );
});
