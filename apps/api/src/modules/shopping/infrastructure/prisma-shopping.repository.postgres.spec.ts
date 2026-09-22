import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
});
