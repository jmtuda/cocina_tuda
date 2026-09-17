import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  RecipeRecord,
  RecipeRepository,
} from '../application/recipe.repository.js';
import type { RecipeInput } from '../domain/recipe.js';
import { normalizeName } from '../../catalog/domain/catalog.js';

export const recipeInclude = {
  steps: { orderBy: { position: 'asc' as const } },
  ingredients: {
    orderBy: { position: 'asc' as const },
    include: { ingredient: true, variant: true, unit: true },
  },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
};

type PersistedRecipe = Awaited<
  ReturnType<PrismaService['recipe']['findUniqueOrThrow']>
> & {
  steps: Array<{ id: string; position: number; text: string }>;
  ingredients: Array<{
    id: string;
    position: number;
    ingredientId: string;
    variantId: string | null;
    quantity: { toString(): string } | null;
    unitId: string | null;
    optional: boolean;
    observations: string | null;
    ingredient: { id: string; name: string };
    variant: { id: string; name: string } | null;
    unit: { id: string; name: string; abbreviation: string } | null;
  }>;
  categories: Array<{ category: { id: string; name: string } }>;
  tags: Array<{ tag: { id: string; name: string } }>;
};

export function toRecipeRecord(recipe: PersistedRecipe): RecipeRecord {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    author: recipe.author,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    notes: recipe.notes,
    status: recipe.status,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    archivedAt: recipe.archivedAt,
    steps: recipe.steps.map(({ id, position, text }) => ({
      id,
      position,
      text,
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
    const recipe = await this.prisma.$transaction((transaction) =>
      transaction.recipe.create({
        data: this.data(input),
        include: recipeInclude,
      }),
    );
    return toRecipeRecord(recipe);
  }

  async findById(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: recipeInclude,
    });
    return recipe ? toRecipeRecord(recipe) : null;
  }

  async update(id: string, input: RecipeInput) {
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) return null;
    const recipe = await this.prisma.$transaction(async (transaction) => {
      await transaction.recipeStep.deleteMany({ where: { recipeId: id } });
      await transaction.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });
      await transaction.recipeCategory.deleteMany({ where: { recipeId: id } });
      await transaction.recipeTag.deleteMany({ where: { recipeId: id } });
      return transaction.recipe.update({
        where: { id },
        data: this.data(input),
        include: recipeInclude,
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
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) return null;
    const recipe = await this.prisma.recipe.update({
      where: { id },
      data: {
        status,
        archivedAt: status === 'ARCHIVED' ? new Date() : null,
      },
      include: recipeInclude,
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
      steps: { create: input.steps },
      ingredients: { create: input.ingredients },
      categories: {
        create: (input.categoryIds ?? []).map((categoryId) => ({ categoryId })),
      },
      tags: { create: (input.tagIds ?? []).map((tagId) => ({ tagId })) },
    };
  }
}
