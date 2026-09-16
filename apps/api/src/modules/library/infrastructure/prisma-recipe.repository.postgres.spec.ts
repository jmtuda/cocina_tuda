import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { PrismaRecipeRepository } from './prisma-recipe.repository.js';
import type { RecipeListQuery } from '../application/recipe.repository.js';

const databaseUrl = process.env['TEST_POSTGRES_URL'];
const postgres = databaseUrl ? describe : describe.skip;

postgres('recipe search on PostgreSQL', () => {
  let prisma: PrismaService;
  let repository: PrismaRecipeRepository;
  let tomatoId: string;
  let basilId: string;
  let cherryId: string;

  const query = (overrides: Partial<RecipeListQuery>): RecipeListQuery => ({
    page: 1,
    pageSize: 20,
    statuses: ['ACTIVE'],
    categoryIds: [],
    tagIds: [],
    text: '',
    ingredientIds: [],
    variantIds: [],
    ...overrides,
  });

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    prisma = new PrismaService();
    repository = new PrismaRecipeRepository(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE recipe_tags, recipe_categories, recipe_ingredients, recipe_steps, recipes, ingredient_variants, ingredients, units, categories, tags CASCADE',
    );
    const tomato = await prisma.ingredient.create({
      data: { name: 'Tomate', normalizedName: 'tomate' },
    });
    const basil = await prisma.ingredient.create({
      data: { name: 'Albahaca', normalizedName: 'albahaca' },
    });
    const cherry = await prisma.ingredientVariant.create({
      data: {
        ingredientId: tomato.id,
        name: 'Chérry',
        normalizedName: 'cherry',
      },
    });
    const category = await prisma.category.create({
      data: { name: 'Italiana', normalizedName: 'italiana' },
    });
    const tag = await prisma.tag.create({
      data: { name: 'Rápida', normalizedName: 'rapida' },
    });
    tomatoId = tomato.id;
    basilId = basil.id;
    cherryId = cherry.id;

    await prisma.recipe.create({
      data: {
        name: 'Tomate',
        normalizedName: 'tomate',
        description: 'Ensalada fresca',
        ingredients: {
          create: [
            {
              position: 0,
              ingredientId: tomato.id,
              variantId: cherry.id,
            },
            { position: 1, ingredientId: basil.id },
          ],
        },
        categories: { create: { categoryId: category.id } },
        tags: { create: { tagId: tag.id } },
      },
    });
    await prisma.recipe.create({
      data: {
        name: 'Sopa sencilla',
        normalizedName: 'sopa sencilla',
        description: 'Tomate triturado para días fríos',
        ingredients: { create: { position: 0, ingredientId: tomato.id } },
      },
    });
  });

  afterAll(async () => prisma?.$disconnect());

  it('matches every accent-insensitive token across different searchable fields', async () => {
    const result = (await repository.list(
      query({ text: 'tomáte rápida italiana' }),
    )) as { items: Array<{ name: string }> };
    expect(result.items.map((item) => item.name)).toEqual(['Tomate']);
  });

  it('orders an exact name before lower-priority matches', async () => {
    const result = (await repository.list(query({ text: 'tomate' }))) as {
      items: Array<{ name: string }>;
    };
    expect(result.items.map((item) => item.name)).toEqual([
      'Tomate',
      'Sopa sencilla',
    ]);
  });

  it('distinguishes base ingredients and variants and ANDs selections', async () => {
    const base = (await repository.list(
      query({ ingredientIds: [tomatoId, basilId] }),
    )) as { items: Array<{ name: string }> };
    const variant = (await repository.list(
      query({ variantIds: [cherryId] }),
    )) as { items: Array<{ name: string }> };
    expect(base.items.map((item) => item.name)).toEqual(['Tomate']);
    expect(variant.items.map((item) => item.name)).toEqual(['Tomate']);
  });
});
