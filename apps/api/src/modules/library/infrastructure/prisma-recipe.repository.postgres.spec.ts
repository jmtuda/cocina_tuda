import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { PrismaSearchRepository } from '../../search/infrastructure/prisma-search.repository.js';
import type { RecipeSearchQuery } from '../../search/application/search.repository.js';
import { PrismaRecipeRepository } from './prisma-recipe.repository.js';
import type { RecipeInput } from '../domain/recipe.js';

const databaseUrl = process.env['TEST_POSTGRES_URL'];
const postgres = databaseUrl ? describe : describe.skip;

postgres('recipe search on PostgreSQL', () => {
  let prisma: PrismaService;
  let repository: PrismaSearchRepository;
  let tomatoId: string;
  let basilId: string;
  let cherryId: string;

  const query = (overrides: Partial<RecipeSearchQuery>): RecipeSearchQuery => ({
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
    repository = new PrismaSearchRepository(prisma);
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
    const tomatoCategory = await prisma.category.create({
      data: { name: 'Tomate especial', normalizedName: 'tomate especial' },
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
        name: 'Tomate asado',
        normalizedName: 'tomate asado',
      },
    });
    await prisma.recipe.create({
      data: {
        name: 'Pasta sencilla',
        normalizedName: 'pasta sencilla',
        ingredients: { create: { position: 0, ingredientId: tomato.id } },
      },
    });
    await prisma.recipe.create({
      data: {
        name: 'Receta clasificada',
        normalizedName: 'receta clasificada',
        categories: { create: { categoryId: tomatoCategory.id } },
      },
    });
    await prisma.recipe.create({
      data: {
        name: 'Sopa sencilla',
        normalizedName: 'sopa sencilla',
        description: 'Tomate triturado para días fríos',
        ingredients: { create: { position: 0, ingredientId: basil.id } },
      },
    });
  });

  afterAll(async () => prisma?.$disconnect());

  it('defaults to unreviewed, toggles review and preserves it when omitted on update', async () => {
    const recipes = new PrismaRecipeRepository(prisma);
    const input: RecipeInput = {
      name: 'Revisión editable',
      notes: 'Conservar',
      steps: [
        {
          position: 0,
          text: 'Cocinar',
          mambo: { speed: 0, durationSeconds: 90 },
        },
      ],
      ingredients: [
        {
          position: 0,
          ingredientId: basilId,
          quantity: '0.125',
          optional: true,
        },
      ],
    };
    const created = await recipes.create(input);
    try {
      expect(created.reviewed).toBe(false);
      expect(
        (await recipes.update(created.id, { ...input, reviewed: true }))
          ?.reviewed,
      ).toBe(true);
      expect(
        (await recipes.update(created.id, { ...input, notes: 'Otra nota' }))
          ?.reviewed,
      ).toBe(true);
      const read = await recipes.findById(created.id);
      expect(read).toMatchObject({ reviewed: true, notes: 'Otra nota' });
      expect(
        read?.steps.map(({ position, text, mambo }) => ({
          position,
          text,
          mambo,
        })),
      ).toEqual(
        created.steps.map(({ position, text, mambo }) => ({
          position,
          text,
          mambo,
        })),
      );
      expect(read?.ingredients[0]).toMatchObject({
        quantity: '0.125',
        optional: true,
      });
      for (const text of ['', 'Revisión editable']) {
        const result = await repository.search(query({ text }));
        expect(
          result.items.find((item) => item.id === created.id)?.reviewed,
        ).toBe(true);
      }
      expect((await recipes.archive(created.id))?.reviewed).toBe(true);
      expect((await recipes.restore(created.id))?.reviewed).toBe(true);
      expect(
        (await recipes.update(created.id, { ...input, reviewed: false }))
          ?.reviewed,
      ).toBe(false);
      expect((await recipes.findById(created.id))?.reviewed).toBe(false);
    } finally {
      await prisma.recipe.delete({ where: { id: created.id } });
    }
  });

  it('roundtrips optional Mambo configuration, zeros, edits and removal on PostgreSQL', async () => {
    const recipes = new PrismaRecipeRepository(prisma);
    const input: RecipeInput = {
      name: 'Mambo roundtrip',
      description: 'Conservar descripción',
      ingredients: [
        {
          position: 0,
          ingredientId: basilId,
          quantity: '0.125',
          optional: true,
        },
      ],
      steps: [
        {
          position: 0,
          text: 'Cocinar',
          mambo: {
            speed: 0,
            temperature: 120,
            ct: 0,
            durationSeconds: 2147483647,
            observations: 'Vapor',
          },
        },
        { position: 1, text: 'Servir', mambo: { observations: '  ' } },
      ],
    };
    const created = await recipes.create(input);
    try {
      expect(created.steps[0]?.mambo).toEqual(input.steps[0]?.mambo);
      expect(created.steps[1]?.mambo).toBeNull();
      expect((await recipes.findById(created.id))?.steps).toEqual(
        created.steps,
      );
      input.steps[0].mambo = { temperature: 0, observations: 'Editado' };
      const edited = await recipes.update(created.id, input);
      expect(edited?.steps[0]?.mambo).toEqual({
        speed: null,
        temperature: 0,
        ct: null,
        durationSeconds: null,
        observations: 'Editado',
      });
      expect(edited?.description).toBe(input.description);
      expect(edited?.ingredients[0]).toMatchObject({
        ingredientId: basilId,
        quantity: '0.125',
        optional: true,
      });
      input.steps[0].mambo = null;
      await recipes.update(created.id, input);
      expect(
        (await recipes.findById(created.id))?.steps.map((step) => step.mambo),
      ).toEqual([null, null]);
      delete input.steps[0].mambo;
      expect(
        (await recipes.update(created.id, input))?.steps[0]?.mambo,
      ).toBeNull();
    } finally {
      await prisma.recipe.delete({ where: { id: created.id } });
    }
  });

  it('matches every accent-insensitive token across different searchable fields', async () => {
    const result = (await repository.search(
      query({ text: 'tomáte rápida italiana' }),
    )) as { items: Array<{ name: string }> };
    expect(result.items.map((item) => item.name)).toEqual(['Tomate']);
  });

  it('applies every approved relevance tier in order', async () => {
    const result = (await repository.search(query({ text: 'tomate' }))) as {
      items: Array<{ name: string }>;
    };
    expect(result.items.map((item) => item.name)).toEqual([
      'Tomate',
      'Tomate asado',
      'Pasta sencilla',
      'Receta clasificada',
      'Sopa sencilla',
    ]);
  });

  it('distinguishes base ingredients and variants and ANDs selections', async () => {
    const base = (await repository.search(
      query({ ingredientIds: [tomatoId, basilId] }),
    )) as { items: Array<{ name: string }> };
    const variant = (await repository.search(
      query({ variantIds: [cherryId] }),
    )) as { items: Array<{ name: string }> };
    expect(base.items.map((item) => item.name)).toEqual(['Tomate']);
    expect(variant.items.map((item) => item.name)).toEqual(['Tomate']);
  });

  it('keeps the real total on an out-of-range page', async () => {
    const result = await repository.search(
      query({ text: 'tomate', page: 99, pageSize: 1 }),
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(5);
  });
});
