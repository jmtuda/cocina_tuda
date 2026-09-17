import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';

type RecipeBody = {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  steps: Array<{ position: number; text: string }>;
  ingredients: Array<{
    position: number;
    ingredientId: string;
    variantId: string | null;
    quantity: string | null;
    unitId: string | null;
    optional: boolean;
    observations: string | null;
  }>;
  categories: Array<{ id: string }>;
  tags: Array<{ id: string }>;
};

function bodyAs<T>(response: { body: unknown }): T {
  return response.body as T;
}

function idOf(response: { body: unknown }): string {
  return bodyAs<{ id: string }>(response).id;
}

const databaseUrl = process.env['TEST_POSTGRES_URL'];
const postgres = databaseUrl ? describe : describe.skip;

postgres('product flow on PostgreSQL', () => {
  let app: INestApplication;
  let server: Server;
  let ingredientId: string;
  let secondIngredientId: string;
  let variantId: string;
  let unitId: string;
  let categoryId: string;
  let tagId: string;
  let recipeId: string;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    await app
      .get(PrismaService)
      .$executeRawUnsafe(
        'TRUNCATE recipe_tags, recipe_categories, recipe_ingredients, recipe_steps, recipes, ingredient_variants, ingredients, units, categories, tags CASCADE',
      );
  });

  afterAll(async () => app?.close());

  it('creates catalogs and a complete recipe', async () => {
    ingredientId = idOf(
      await request(server)
        .post('/api/v1/catalog/ingredients')
        .send({ name: 'Tomate' })
        .expect(201),
    );
    secondIngredientId = idOf(
      await request(server)
        .post('/api/v1/catalog/ingredients')
        .send({ name: 'Albahaca' })
        .expect(201),
    );
    variantId = idOf(
      await request(server)
        .post(`/api/v1/catalog/ingredients/${ingredientId}/variants`)
        .send({ name: 'Chérry' })
        .expect(201),
    );
    unitId = idOf(
      await request(server)
        .post('/api/v1/catalog/units')
        .send({ name: 'Gramo', abbreviation: 'g' })
        .expect(201),
    );
    categoryId = idOf(
      await request(server)
        .post('/api/v1/classifications/categories')
        .send({ name: 'Italiana' })
        .expect(201),
    );
    tagId = idOf(
      await request(server)
        .post('/api/v1/classifications/tags')
        .send({ name: 'Rápida' })
        .expect(201),
    );

    const response = await request(server)
      .post('/api/v1/recipes')
      .send({
        name: 'Ensalada de tomate',
        description: 'Fresca',
        author: 'Tuda',
        servings: 2,
        difficulty: 'Fácil',
        notes: 'Servir fría',
        steps: [
          { position: 0, text: 'Cortar' },
          { position: 1, text: 'Mezclar' },
        ],
        ingredients: [
          {
            position: 0,
            ingredientId,
            variantId,
            quantity: '125.500',
            unitId,
            optional: true,
            observations: 'Partidos',
          },
          {
            position: 1,
            ingredientId: secondIngredientId,
            optional: false,
            observations: 'Al gusto',
          },
        ],
        categoryIds: [categoryId],
        tagIds: [tagId],
      })
      .expect(201);
    const created = bodyAs<RecipeBody>(response);
    recipeId = created.id;
    expect(created.steps).toHaveLength(2);
    expect(created.ingredients).toHaveLength(2);
    expect(created.ingredients[0]).toMatchObject({
      variantId,
      quantity: '125.5',
      unitId,
      optional: true,
      observations: 'Partidos',
    });
  });

  it('edits, classifies, archives, restores and searches without losing data', async () => {
    const current = bodyAs<RecipeBody>(
      await request(server).get(`/api/v1/recipes/${recipeId}`).expect(200),
    );
    const update = {
      name: current.name,
      description: current.description,
      author: current.author,
      servings: current.servings,
      difficulty: current.difficulty,
      notes: null,
      steps: current.steps.map((step) => ({
        position: step.position,
        text: step.text,
      })),
      ingredients: current.ingredients.map((item) => ({
        position: item.position,
        ingredientId: item.ingredientId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        ...(item.quantity ? { quantity: item.quantity } : {}),
        ...(item.unitId ? { unitId: item.unitId } : {}),
        optional: item.optional,
        ...(item.observations ? { observations: item.observations } : {}),
      })),
      categoryIds: current.categories.map((item) => item.id),
      tagIds: current.tags.map((item) => item.id),
    };
    const edited = await request(server)
      .put(`/api/v1/recipes/${recipeId}`)
      .send(update)
      .expect(200);
    const editedBody = bodyAs<RecipeBody>(edited);
    expect(editedBody.steps).toHaveLength(2);
    expect(editedBody.ingredients[0]).toMatchObject({ variantId, unitId });
    expect(editedBody.notes).toBeNull();

    await request(server)
      .post(`/api/v1/recipes/${recipeId}/archive`)
      .expect(200);
    await request(server)
      .post(`/api/v1/recipes/${recipeId}/restore`)
      .expect(200);
    const found = await request(server)
      .get('/api/v1/recipes')
      .query({ q: 'cherry rápida italiana' })
      .expect(200);
    expect(
      bodyAs<{ items: Array<{ id: string }> }>(found).items.map(
        (item) => item.id,
      ),
    ).toEqual([recipeId]);
  });

  it('returns expected client errors and preserves totals outside the range', async () => {
    await request(server)
      .post('/api/v1/recipes')
      .send({
        name: 'Inválida',
        steps: [],
        ingredients: [
          {
            position: 0,
            ingredientId: '00000000-0000-4000-8000-000000000000',
            optional: false,
          },
        ],
      })
      .expect(400);
    await request(server)
      .post('/api/v1/catalog/ingredients/not-a-uuid/variants')
      .send({ name: 'Inválida' })
      .expect(400);
    await request(server)
      .post('/api/v1/catalog/ingredients')
      .send({ name: '   ' })
      .expect(400);
    const outside = await request(server)
      .get('/api/v1/recipes')
      .query({ q: 'ensalada', page: 99, pageSize: 1 })
      .expect(200);
    expect(bodyAs<unknown>(outside)).toMatchObject({
      items: [],
      total: 1,
      totalPages: 1,
    });
  });
});
