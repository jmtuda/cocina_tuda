import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { RecipeInput, MamboConfiguration } from '../domain/recipe.js';
import { PrismaRecipeRepository } from './prisma-recipe.repository.js';

describe('Prisma recipe Mambo mapping (in-memory delegate)', () => {
  const setup = () => {
    type Data = {
      name: string;
      steps: { create: Array<Record<string, unknown>> };
    };
    let stored: Record<string, unknown> | null = null;
    const persist = ({ data }: { data: Data }) => {
      stored = {
        ...data,
        id: 'recipe',
        status: 'ACTIVE',
        description: null,
        author: null,
        servings: null,
        difficulty: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        steps: data.steps.create.map((step, index) => ({
          ...step,
          id: `step-${index}`,
          recipeId: 'recipe',
        })),
        ingredients: [],
        categories: [],
        tags: [],
      };
      return stored;
    };
    const db = {
      recipe: {
        create: vi.fn(persist),
        update: vi.fn(persist),
        findUnique: vi.fn(() => stored),
      },
      recipeStep: { deleteMany: vi.fn() },
      recipeIngredient: { deleteMany: vi.fn() },
      recipeCategory: { deleteMany: vi.fn() },
      recipeTag: { deleteMany: vi.fn() },
    };
    const prisma = {
      getDb: () => db,
      run: (operation: () => unknown) => Promise.resolve(operation()),
    };
    return {
      repository: new PrismaRecipeRepository(
        prisma as unknown as PrismaService,
      ),
      db,
    };
  };
  const input = (mambo?: MamboConfiguration | null): RecipeInput => ({
    name: 'Mambo',
    ingredients: [],
    steps: [{ position: 0, text: 'Cocinar', mambo }],
  });

  it('roundtrips create/read/edit/remove while preserving other step data and zeros', async () => {
    const { repository, db } = setup();
    const mambo = {
      speed: 0,
      temperature: 120,
      ct: 0,
      durationSeconds: 30,
      observations: 'Vapor',
    };
    expect((await repository.create(input(mambo))).steps[0]).toEqual({
      id: 'step-0',
      position: 0,
      text: 'Cocinar',
      mambo,
    });
    expect((await repository.findById('recipe'))?.steps[0]?.mambo).toEqual(
      mambo,
    );
    const edited = {
      ...mambo,
      temperature: 0,
      durationSeconds: 2147483647,
      observations: 'Editar',
    };
    expect(
      (await repository.update('recipe', input(edited)))?.steps[0]?.mambo,
    ).toEqual(edited);
    expect((await repository.findById('recipe'))?.steps[0]?.mambo).toEqual(
      edited,
    );
    expect((await repository.update('recipe', input(null)))?.steps[0]).toEqual({
      id: 'step-0',
      position: 0,
      text: 'Cocinar',
      mambo: null,
    });
    expect((await repository.findById('recipe'))?.steps[0]?.mambo).toBeNull();
    expect(db.recipeStep.deleteMany).toHaveBeenCalledWith({
      where: { recipeId: 'recipe' },
    });
  });

  it.each([undefined, null, {}, { speed: null, observations: ' ' }])(
    'persists empty configuration as nullable columns: %j',
    async (mambo) => {
      const { repository, db } = setup();
      expect(
        (await repository.create(input(mambo))).steps[0]?.mambo,
      ).toBeNull();
      expect(db.recipe.create.mock.calls[0]?.[0].data.steps.create[0]).toEqual({
        position: 0,
        text: 'Cocinar',
        mamboSpeed: null,
        mamboTemperature: null,
        mamboCt: null,
        mamboDurationSeconds: null,
        mamboObservations: null,
      });
    },
  );
});
