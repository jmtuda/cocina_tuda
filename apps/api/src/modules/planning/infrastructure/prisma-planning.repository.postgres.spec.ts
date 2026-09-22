import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { PrismaPlanningRepository } from './prisma-planning.repository.js';

const databaseUrl = process.env['TEST_POSTGRES_URL'];
const postgres = databaseUrl ? describe : describe.skip;

postgres('planning persistence on PostgreSQL', () => {
  let prisma: PrismaService;
  let repository: PrismaPlanningRepository;
  let recipeId: string;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    prisma = new PrismaService();
    repository = new PrismaPlanningRepository(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE planned_meals, recipe_tags, recipe_categories, recipe_ingredients, recipe_steps, recipes, ingredient_variants, ingredients, units, categories, tags CASCADE',
    );
    const recipe = await prisma.recipe.create({
      data: { name: 'Tortilla', normalizedName: 'tortilla' },
    });
    recipeId = recipe.id;
  });

  afterAll(async () => prisma?.$disconnect());

  it('persists exact duplicate associations and reads the exact calendar day', async () => {
    const input = {
      recipeId,
      plannedDate: '2026-09-21',
      mealName: 'Cena',
    };
    const first = await repository.create(input);
    const second = await repository.create(input);
    expect(first.id).not.toBe(second.id);
    expect(first.plannedDate).toBe('2026-09-21');
    expect(second.plannedDate).toBe('2026-09-21');
    expect(
      await repository.findBetween('2026-09-21', '2026-09-21'),
    ).toHaveLength(2);
    expect(await repository.findBetween('2026-09-22', '2026-09-27')).toEqual(
      [],
    );
  });

  it('keeps plans and exposes current recipe state after archival and reactivation', async () => {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
    const archived = await repository.findBetween('2026-09-21', '2026-09-21');
    expect(archived.every((item) => item.recipe.status === 'ARCHIVED')).toBe(
      true,
    );
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { status: 'ACTIVE', archivedAt: null },
    });
    const restored = await repository.findBetween('2026-09-21', '2026-09-21');
    expect(restored.every((item) => item.recipe.status === 'ACTIVE')).toBe(
      true,
    );
  });

  it('updates and permanently deletes only the chosen association', async () => {
    const records = await repository.findBetween('2026-09-21', '2026-09-21');
    const chosen = records[0];
    const updated = await repository.update(chosen.id, {
      recipeId,
      plannedDate: '2026-09-22',
      mealName: 'Invitados',
    });
    expect(updated).toMatchObject({
      plannedDate: '2026-09-22',
      mealName: 'Invitados',
    });
    expect(await repository.delete(chosen.id)).toBe(true);
    expect(await repository.findById(chosen.id)).toBeNull();
    expect(
      await repository.findBetween('2026-09-21', '2026-09-21'),
    ).toHaveLength(1);
  });
});
