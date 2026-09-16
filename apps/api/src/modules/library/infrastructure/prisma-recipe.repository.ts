import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { RecipeRepository } from '../application/recipe.repository.js';
import type { RecipeListQuery } from '../application/recipe.repository.js';
import type { RecipeInput } from '../domain/recipe.js';
import { normalizeName } from '../../catalog/domain/catalog.js';

const recipeInclude = {
  steps: { orderBy: { position: 'asc' as const } },
  ingredients: {
    orderBy: { position: 'asc' as const },
    include: { ingredient: true, variant: true, unit: true },
  },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
};

@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: RecipeInput) {
    return this.prisma.$transaction((transaction) =>
      transaction.recipe.create({
        data: this.data(input),
        include: recipeInclude,
      }),
    );
  }

  findById(id: string) {
    return this.prisma.recipe.findUnique({
      where: { id },
      include: recipeInclude,
    });
  }

  async update(id: string, input: RecipeInput) {
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) return null;
    return this.prisma.$transaction(async (transaction) => {
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
  }

  async archive(id: string) {
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) return null;
    return this.prisma.recipe.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      include: recipeInclude,
    });
  }

  async restore(id: string) {
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) return null;
    return this.prisma.recipe.update({
      where: { id },
      data: { status: 'ACTIVE', archivedAt: null },
      include: recipeInclude,
    });
  }

  async list(query: RecipeListQuery) {
    const where = {
      status: { in: query.statuses },
      ...(query.categoryIds.length
        ? { categories: { some: { categoryId: { in: query.categoryIds } } } }
        : {}),
      ...(query.tagIds.length
        ? { tags: { some: { tagId: { in: query.tagIds } } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where,
        orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.recipe.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
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
