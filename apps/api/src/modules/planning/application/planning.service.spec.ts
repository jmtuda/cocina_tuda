import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RecipeReferenceReader } from '../../library/application/recipe-reference.reader.js';
import type { PlannedMealInput } from '../domain/planned-meal.js';
import type {
  PlannedMealRecord,
  PlanningRepository,
} from './planning.repository.js';
import { PlanningService } from './planning.service.js';

class MemoryPlanningRepository implements PlanningRepository {
  records: PlannedMealRecord[] = [];
  nextId = 1;

  create(input: PlannedMealInput) {
    const record = this.record(String(this.nextId++), input);
    this.records.push(record);
    return Promise.resolve(record);
  }

  findById(id: string) {
    return Promise.resolve(this.records.find((item) => item.id === id) ?? null);
  }

  findBetween(from: string, to: string) {
    return Promise.resolve(
      this.records.filter(
        (item) => item.plannedDate >= from && item.plannedDate <= to,
      ),
    );
  }

  update(id: string, input: PlannedMealInput) {
    const index = this.records.findIndex((item) => item.id === id);
    if (index < 0) return Promise.resolve(null);
    const record = this.record(id, input);
    this.records[index] = record;
    return Promise.resolve(record);
  }

  delete(id: string) {
    const size = this.records.length;
    this.records = this.records.filter((item) => item.id !== id);
    return Promise.resolve(this.records.length < size);
  }

  private record(id: string, input: PlannedMealInput): PlannedMealRecord {
    return {
      id,
      ...input,
      mealName: input.mealName ?? null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      recipe: { id: input.recipeId, name: 'Tortilla', status: 'ACTIVE' },
    };
  }
}

describe('PlanningService', () => {
  let repository: MemoryPlanningRepository;
  let recipeStatus: 'ACTIVE' | 'ARCHIVED';
  let service: PlanningService;

  beforeEach(() => {
    repository = new MemoryPlanningRepository();
    recipeStatus = 'ACTIVE';
    const recipes: RecipeReferenceReader = {
      findRecipeReference: (id) =>
        Promise.resolve({ id, name: 'Tortilla', status: recipeStatus }),
    };
    service = new PlanningService(repository, recipes);
  });

  it('creates exact duplicates with independent identities and lists days inclusively', async () => {
    const input = {
      recipeId: 'recipe-1',
      plannedDate: '2026-09-21',
      mealName: 'Cena',
    };
    const first = await service.create(input);
    const second = await service.create(input);
    expect(first.id).not.toBe(second.id);
    expect(await service.list('2026-09-21', '2026-09-27')).toHaveLength(2);
    expect(await service.list('2026-09-22', '2026-09-27')).toEqual([]);
  });

  it('edits and permanently removes an association', async () => {
    const created = await service.create({
      recipeId: 'recipe-1',
      plannedDate: '2026-09-21',
    });
    const updated = await service.update(created.id, {
      recipeId: 'recipe-1',
      plannedDate: '2026-09-22',
      mealName: 'Invitados',
    });
    expect(updated.plannedDate).toBe('2026-09-22');
    await service.remove(created.id);
    expect(repository.records).toEqual([]);
  });

  it('keeps an existing plan editable after archival but rejects new archived references', async () => {
    const created = await service.create({
      recipeId: 'recipe-1',
      plannedDate: '2026-09-21',
    });
    recipeStatus = 'ARCHIVED';
    await expect(
      service.create({
        recipeId: 'recipe-1',
        plannedDate: '2026-09-22',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.update(created.id, {
        recipeId: 'recipe-1',
        plannedDate: '2026-09-23',
        mealName: 'Cena',
      }),
    ).resolves.toMatchObject({ plannedDate: '2026-09-23' });
    recipeStatus = 'ACTIVE';
    await expect(
      service.create({
        recipeId: 'recipe-1',
        plannedDate: '2026-09-24',
      }),
    ).resolves.toBeDefined();
  });
});
