import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { PrismaShoppingRepository } from './prisma-shopping.repository.js';

const databaseUrl = process.env['TEST_POSTGRES_URL'];
const postgres = databaseUrl ? describe : describe.skip;

postgres('shopping persistence on PostgreSQL', () => {
  let prisma: PrismaService;
  let repository: PrismaShoppingRepository;
  let ingredientId: string;
  let variantId: string;
  let unitId: string;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    prisma = new PrismaService();
    repository = new PrismaShoppingRepository(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE shopping_item_sources, shopping_items, shopping_list_sources, shopping_lists, planned_meals, recipe_tags, recipe_categories, recipe_ingredients, recipe_steps, recipes, ingredient_variants, ingredients, units, categories, tags CASCADE',
    );
    const ingredient = await prisma.ingredient.create({
      data: { name: 'Tomate', normalizedName: 'tomate' },
    });
    ingredientId = ingredient.id;
    variantId = (
      await prisma.ingredientVariant.create({
        data: {
          ingredientId,
          name: 'Chérry',
          normalizedName: 'cherry',
        },
      })
    ).id;
    unitId = (
      await prisma.unit.create({
        data: { name: 'Gramo', abbreviation: 'g', normalizedName: 'gramo' },
      })
    ).id;
  });

  afterAll(async () => prisma?.$disconnect());

  it('persists and reads a generated snapshot with exact provenance', async () => {
    const list = await repository.createGenerated({
      name: 'Semana',
      from: '2026-09-21',
      to: '2026-09-27',
      sources: [
        {
          plannedMealId: '00000000-0000-4000-8000-000000000001',
          recipeId: '00000000-0000-4000-8000-000000000002',
          recipeName: 'Ensalada',
          plannedDate: '2026-09-21',
        },
      ],
      items: [
        {
          ingredientId,
          ingredientName: 'Tomate',
          variantId,
          variantName: 'Chérry',
          quantity: '125.5',
          unitId,
          unitName: 'Gramo',
          unitAbbreviation: 'g',
          optional: false,
          observations: 'Partidos',
          sources: [
            {
              plannedMealId: '00000000-0000-4000-8000-000000000001',
              recipeIngredientId: '00000000-0000-4000-8000-000000000003',
            },
          ],
        },
      ],
    });

    expect(list).toMatchObject({
      sourceFrom: '2026-09-21',
      sourceTo: '2026-09-27',
      items: [
        {
          quantity: '125.5',
          observations: 'Partidos',
          ingredient: { name: 'Tomate' },
          variant: { name: 'Chérry' },
          unit: { abbreviation: 'g' },
        },
      ],
    });
    expect(list.items[0]?.sources[0]).toMatchObject({
      recipeName: 'Ensalada',
      plannedDate: '2026-09-21',
    });
  });

  it('allows free manual items to be edited and permanently removed', async () => {
    const [list] = await repository.list();
    if (!list) throw new Error('Lista de prueba ausente');
    const added = await repository.addItem(list.id, {
      manualName: 'Papel de cocina',
      quantity: null,
      unitId: null,
      optional: true,
      purchased: false,
    });
    expect(added).toMatchObject({
      manualName: 'Papel de cocina',
      ingredient: null,
      optional: true,
    });
    if (!added) throw new Error('Elemento de prueba ausente');
    const updated = await repository.updateItem(list.id, added.id, {
      manualName: 'Papel absorbente',
      quantity: '2',
      unitId: null,
      observations: 'Rollos',
      optional: false,
      purchased: true,
    });
    expect(updated).toMatchObject({
      manualName: 'Papel absorbente',
      quantity: '2',
      observations: 'Rollos',
      purchased: true,
    });
    expect(await repository.deleteItem(list.id, added.id)).toBe(true);
    const persisted = await repository.findById(list.id);
    expect(persisted?.items).toHaveLength(1);
  });
  it('persists multiple batches with complete provenance and decimal quantities', async () => {
    const sources = [0, 1].map(() => ({
      plannedMealId: randomUUID(),
      recipeId: randomUUID(),
      recipeName: 'Receta sintética',
      plannedDate: '2026-10-16',
    }));
    const list = await repository.createGenerated({
      name: 'Lotes sintéticos',
      from: '2026-10-16',
      to: '2026-10-17',
      sources,
      items: Array.from({ length: 501 }, (_, index) => ({
        ingredientId,
        ingredientName: 'Tomate',
        variantId,
        variantName: 'Chérry',
        quantity: index === 0 ? '0' : '0.125',
        unitId,
        unitName: 'Gramo',
        unitAbbreviation: 'g',
        optional: index % 2 === 0,
        observations: `Línea ${index}`,
        sources: sources.map((source) => ({
          plannedMealId: source.plannedMealId,
          recipeIngredientId: randomUUID(),
        })),
      })),
    });
    expect(list.items).toHaveLength(501);
    expect(list.sources).toHaveLength(2);
    expect(list.items[0]?.quantity).toBe('0');
    expect(list.items[500]).toMatchObject({
      position: 500,
      quantity: '0.125',
      observations: 'Línea 500',
      optional: true,
    });
    expect(list.items.every((item) => item.sources.length === 2)).toBe(true);
    const persisted = await repository.findById(list.id);
    expect(persisted).toEqual(list);
    expect(
      await prisma.shoppingItemSource.count({
        where: { shoppingItem: { shoppingListId: list.id } },
      }),
    ).toBe(1002);
  }, 30000);

  it('rolls back all batches when a later batch has an invalid reference', async () => {
    const counts = async () =>
      Promise.all([
        prisma.shoppingList.count(),
        prisma.shoppingListSource.count(),
        prisma.shoppingItem.count(),
        prisma.shoppingItemSource.count(),
      ]);
    const before = await counts();
    const source = {
      plannedMealId: randomUUID(),
      recipeId: randomUUID(),
      recipeName: 'Rollback sintético',
      plannedDate: '2026-10-16',
    };
    await expect(
      repository.createGenerated({
        name: 'No debe persistir',
        from: '2026-10-16',
        to: '2026-10-16',
        sources: [source],
        items: Array.from({ length: 501 }, (_, index) => ({
          ingredientId: index === 500 ? randomUUID() : ingredientId,
          ingredientName: 'Tomate',
          variantId: null,
          variantName: null,
          quantity: '1',
          unitId,
          unitName: 'Gramo',
          unitAbbreviation: 'g',
          optional: false,
          observations: null,
          sources: [
            {
              plannedMealId: source.plannedMealId,
              recipeIngredientId: randomUUID(),
            },
          ],
        })),
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(await counts()).toEqual(before);
  }, 30000);

  it('creates an empty list without invoking empty batch operations', async () => {
    const list = await repository.createGenerated({
      name: 'Sin comidas',
      from: '2026-10-16',
      to: '2026-10-16',
      sources: [],
      items: [],
    });
    expect(list.items).toEqual([]);
    expect(list.sources).toEqual([]);
  });
});
