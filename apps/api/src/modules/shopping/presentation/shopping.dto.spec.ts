import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { ShoppingListQueryDto } from './shopping.dto.js';
import { ShoppingService } from '../application/shopping.service.js';
import type { ShoppingRepository } from '../application/shopping.repository.js';
import type { PlanningSourceReader } from '../../planning/application/planning-source.reader.js';
import type { RecipeReferenceReader } from '../../library/application/recipe-reference.reader.js';
import type { CatalogReferenceReader } from '../../catalog/application/catalog-reference.reader.js';

describe('shopping pagination validation', () => {
  it('defaults and transforms pagination and enforces positive integers with a maximum of 100', async () => {
    const defaults = plainToInstance(ShoppingListQueryDto, {});
    expect(defaults).toMatchObject({ page: 1, pageSize: 20 });
    expect(await validate(defaults)).toEqual([]);
    const query = plainToInstance(ShoppingListQueryDto, {
      page: '2',
      pageSize: '100',
    });
    expect(query).toMatchObject({ page: 2, pageSize: 100 });
    expect(await validate(query)).toEqual([]);
    for (const values of [
      { page: '0' },
      { page: '1.5' },
      { page: 'no' },
      { pageSize: '101' },
      { pageSize: '0' },
      { pageSize: '' },
    ]) {
      expect(
        await validate(plainToInstance(ShoppingListQueryDto, values)),
      ).not.toEqual([]);
    }
  });

  it('delegates bounded defaults and refuses unsafe offsets before querying', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    const service = new ShoppingService(
      { list } as unknown as ShoppingRepository,
      {} as PlanningSourceReader,
      {} as RecipeReferenceReader,
      {} as CatalogReferenceReader,
    );
    await service.list();
    expect(list).toHaveBeenCalledExactlyOnceWith(1, 20);
    for (const [page, pageSize] of [
      [0, 20],
      [1, 101],
      [1.5, 20],
      [Number.MAX_SAFE_INTEGER, 100],
    ]) {
      expect(() => service.list(page, pageSize)).toThrow(
        'Paginación no válida',
      );
    }
    expect(list).toHaveBeenCalledTimes(1);
  });
});
