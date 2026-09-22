import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { RECIPE_INTERPRETER } from '../src/modules/import/application/recipe-interpreter.js';

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
    })
      .overrideProvider(RECIPE_INTERPRETER)
      .useValue({
        interpret: () =>
          Promise.resolve({
            name: 'Propuesta sin persistir',
            description: null,
            author: null,
            servings: null,
            difficulty: null,
            notes: null,
            steps: ['Revisar'],
            ingredients: [],
            categories: [],
            tags: [],
          }),
      })
      .compile();
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

  it('requires consent and creates a proposal without definitive persistence', async () => {
    await request(server)
      .post('/api/v1/imports/proposals')
      .send({
        consent: false,
        source: { kind: 'text', text: 'Una receta' },
      })
      .expect(400);
    const result = await request(server)
      .post('/api/v1/imports/proposals')
      .send({
        consent: true,
        source: { kind: 'text', text: 'Una receta' },
      })
      .expect(201);
    expect(bodyAs<{ proposal: { name: string } }>(result).proposal.name).toBe(
      'Propuesta sin persistir',
    );
    expect(await app.get(PrismaService).recipe.count()).toBe(0);
  });

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

  it('plans duplicate meals, preserves calendar dates and keeps archived references', async () => {
    const payload = {
      recipeId,
      plannedDate: '2026-09-21',
      mealName: 'Cena',
    };
    const first = await request(server)
      .post('/api/v1/planned-meals')
      .send(payload)
      .expect(201);
    const second = await request(server)
      .post('/api/v1/planned-meals')
      .send(payload)
      .expect(201);
    expect(idOf(first)).not.toBe(idOf(second));

    const week = await request(server)
      .get('/api/v1/planned-meals')
      .query({ from: '2026-09-21', to: '2026-09-27' })
      .expect(200);
    expect(
      bodyAs<Array<{ plannedDate: string }>>(week).map(
        (meal) => meal.plannedDate,
      ),
    ).toEqual(['2026-09-21', '2026-09-21']);

    await request(server)
      .post(`/api/v1/recipes/${recipeId}/archive`)
      .expect(200);
    const archivedWeek = await request(server)
      .get('/api/v1/planned-meals')
      .query({ from: '2026-09-21', to: '2026-09-27' })
      .expect(200);
    expect(
      bodyAs<Array<{ recipe: { status: string } }>>(archivedWeek).every(
        (meal) => meal.recipe.status === 'ARCHIVED',
      ),
    ).toBe(true);
    await request(server)
      .post('/api/v1/planned-meals')
      .send({ ...payload, plannedDate: '2026-09-22' })
      .expect(409);
    await request(server)
      .put(`/api/v1/planned-meals/${idOf(first)}`)
      .send({ ...payload, plannedDate: '2026-09-22', mealName: 'Invitados' })
      .expect(200)
      .expect(({ body }: { body: { plannedDate: string } }) => {
        expect(body.plannedDate).toBe('2026-09-22');
      });

    await request(server)
      .post(`/api/v1/recipes/${recipeId}/restore`)
      .expect(200);
    await request(server)
      .post('/api/v1/planned-meals')
      .send({ ...payload, plannedDate: '2026-09-23' })
      .expect(201);
    await request(server)
      .delete(`/api/v1/planned-meals/${idOf(second)}`)
      .expect(204);
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

  it('atomically confirms approved catalog creations with a new imported recipe', async () => {
    const confirmed = await request(server)
      .post('/api/v1/imports/confirmations')
      .send({
        name: 'Receta importada',
        description: 'Revisada por el usuario',
        steps: ['Preparar', 'Servir'],
        ingredients: [
          {
            ingredient: { createName: 'Patata' },
            variant: { createName: 'Nueva' },
            unit: {
              createName: 'Kilogramo',
              createAbbreviation: 'kg',
            },
            quantity: '1.250',
            optional: false,
          },
        ],
        categories: [{ createName: 'Casera' }],
        tags: [{ createName: 'Importada' }],
      })
      .expect(201);
    const body = bodyAs<RecipeBody>(confirmed);
    expect(body).toMatchObject({ name: 'Receta importada' });
    expect(body.ingredients[0]).toMatchObject({ quantity: '1.25' });
    expect(body.categories).toHaveLength(1);
    expect(body.tags).toHaveLength(1);
  });

  it('rolls back catalog creations when imported recipe persistence fails', async () => {
    await request(server)
      .post('/api/v1/imports/confirmations')
      .send({
        name: 'Debe fallar',
        steps: [],
        ingredients: [
          {
            ingredient: { createName: 'Ingrediente rollback' },
            optional: false,
          },
        ],
        categories: [{ existingId: '00000000-0000-4000-8000-000000000000' }],
        tags: [],
      })
      .expect(400);
    const prisma = app.get(PrismaService);
    expect(
      await prisma.ingredient.count({
        where: { normalizedName: 'ingrediente rollback' },
      }),
    ).toBe(0);
    expect(
      await prisma.recipe.count({ where: { normalizedName: 'debe fallar' } }),
    ).toBe(0);
  });
});
