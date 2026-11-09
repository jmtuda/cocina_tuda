import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  RecipeRecord,
  RecipeRepository,
} from '../application/recipe.repository.js';
import type { RecipeInput } from '../domain/recipe.js';
import { normalizeMambo } from '../domain/recipe.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { normalizeName } from '../../catalog/domain/catalog.js';

const namedSelect = { id: true, name: true } as const;
const ingredientSelect = {
  id: true,
  position: true,
  ingredientId: true,
  variantId: true,
  quantity: true,
  unitId: true,
  optional: true,
  observations: true,
  ingredient: { select: namedSelect },
  variant: { select: namedSelect },
  unit: { select: { ...namedSelect, abbreviation: true } },
} as const;

const referenceSelect = { id: true, name: true, status: true } as const;
export const recipeSelect = {
  ...referenceSelect,
  description: true,
  author: true,
  servings: true,
  difficulty: true,
  notes: true,
  reviewed: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  steps: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      text: true,
      mamboSpeed: true,
      mamboTemperature: true,
      mamboCt: true,
      mamboDurationSeconds: true,
      mamboObservations: true,
    },
  },
  ingredients: { orderBy: { position: 'asc' }, select: ingredientSelect },
  categories: { select: { category: { select: namedSelect } } },
  tags: { select: { tag: { select: namedSelect } } },
} satisfies Prisma.RecipeSelect;

type PersistedRecipe = Prisma.RecipeGetPayload<{ select: typeof recipeSelect }>;

export function toRecipeRecord(recipe: PersistedRecipe): RecipeRecord {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    author: recipe.author,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    notes: recipe.notes,
    reviewed: recipe.reviewed,
    status: recipe.status,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    archivedAt: recipe.archivedAt,
    steps: recipe.steps.map((step) => ({
      id: step.id,
      position: step.position,
      text: step.text,
      mambo: normalizeMambo({
        speed: step.mamboSpeed,
        temperature: step.mamboTemperature,
        ct: step.mamboCt,
        durationSeconds: step.mamboDurationSeconds,
        observations: step.mamboObservations,
      }),
    })),
    ingredients: recipe.ingredients.map((item) => ({
      id: item.id,
      position: item.position,
      ingredientId: item.ingredientId,
      variantId: item.variantId,
      quantity: item.quantity?.toString() ?? null,
      unitId: item.unitId,
      optional: item.optional,
      observations: item.observations,
      ingredient: { id: item.ingredient.id, name: item.ingredient.name },
      variant: item.variant
        ? { id: item.variant.id, name: item.variant.name }
        : null,
      unit: item.unit
        ? {
            id: item.unit.id,
            name: item.unit.name,
            abbreviation: item.unit.abbreviation,
          }
        : null,
    })),
    categories: recipe.categories.map(({ category }) => ({
      id: category.id,
      name: category.name,
    })),
    tags: recipe.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })),
  };
}

@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: RecipeInput) {
    const recipe = await this.prisma.run(() =>
      this.prisma.getDb().recipe.create({
        data: this.data(input),
        select: recipeSelect,
      }),
    );
    return toRecipeRecord(recipe);
  }

  async findById(id: string) {
    const recipe = await this.prisma.getDb().recipe.findUnique({
      where: { id },
      select: recipeSelect,
    });
    return recipe ? toRecipeRecord(recipe) : null;
  }

  async findRecipeReference(id: string) {
    return this.prisma.getDb().recipe.findUnique({
      where: { id },
      select: referenceSelect,
    });
  }

  async findShoppingRecipeSnapshot(id: string) {
    const recipe = await this.prisma.getDb().recipe.findUnique({
      where: { id },
      select: {
        ...referenceSelect,
        servings: true,
        ingredients: {
          orderBy: { position: 'asc' },
          select: { ...ingredientSelect, position: false },
        },
      },
    });
    return recipe
      ? {
          id: recipe.id,
          name: recipe.name,
          status: recipe.status,
          servings: recipe.servings,
          ingredients: recipe.ingredients.map((item) => ({
            id: item.id,
            ingredientId: item.ingredientId,
            ingredientName: item.ingredient.name,
            variantId: item.variantId,
            variantName: item.variant?.name ?? null,
            quantity: item.quantity?.toString() ?? null,
            unitId: item.unitId,
            unitName: item.unit?.name ?? null,
            unitAbbreviation: item.unit?.abbreviation ?? null,
            optional: item.optional,
            observations: item.observations,
          })),
        }
      : null;
  }

  async update(id: string, input: RecipeInput) {
    const exists = await this.prisma
      .getDb()
      .recipe.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const recipe = await this.prisma.run(async () => {
      await this.prisma
        .getDb()
        .recipeStep.deleteMany({ where: { recipeId: id } });
      await this.prisma.getDb().recipeIngredient.deleteMany({
        where: { recipeId: id },
      });
      await this.prisma.getDb().recipeCategory.deleteMany({
        where: { recipeId: id },
      });
      await this.prisma
        .getDb()
        .recipeTag.deleteMany({ where: { recipeId: id } });
      return this.prisma.getDb().recipe.update({
        where: { id },
        data: this.data(input),
        select: recipeSelect,
      });
    });
    return toRecipeRecord(recipe);
  }

  async archive(id: string) {
    return this.changeStatus(id, 'ARCHIVED');
  }

  async restore(id: string) {
    return this.changeStatus(id, 'ACTIVE');
  }

  private async changeStatus(id: string, status: 'ACTIVE' | 'ARCHIVED') {
    const exists = await this.prisma
      .getDb()
      .recipe.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const recipe = await this.prisma.getDb().recipe.update({
      where: { id },
      data: {
        status,
        archivedAt: status === 'ARCHIVED' ? new Date() : null,
      },
      select: recipeSelect,
    });
    return toRecipeRecord(recipe);
  }

  private data(input: RecipeInput) {
    return {
      name: input.name,
      normalizedName: normalizeName(input.name),
      description: input.description,
      author: input.author,
      servings: input.servings,
      difficulty: input.difficulty,
      notes: input.notes,
      reviewed: input.reviewed,
      steps: {
        create: input.steps.map(({ position, text, mambo }) => {
          const configuration = normalizeMambo(mambo);
          return {
            position,
            text,
            mamboSpeed: configuration?.speed ?? null,
            mamboTemperature: configuration?.temperature ?? null,
            mamboCt: configuration?.ct ?? null,
            mamboDurationSeconds: configuration?.durationSeconds ?? null,
            mamboObservations: configuration?.observations ?? null,
          };
        }),
      },
      ingredients: { create: input.ingredients },
      categories: {
        create: (input.categoryIds ?? []).map((categoryId) => ({ categoryId })),
      },
      tags: { create: (input.tagIds ?? []).map((tagId) => ({ tagId })) },
    };
  }
}
