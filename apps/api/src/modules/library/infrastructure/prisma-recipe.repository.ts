import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { RecipeRepository } from '../application/recipe.repository.js';
import type { RecipeInput } from '../domain/recipe.js';

const recipeInclude = {
  steps: { orderBy: { position: 'asc' as const } },
  ingredients: {
    orderBy: { position: 'asc' as const },
    include: { ingredient: true, variant: true, unit: true },
  },
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

  private data(input: RecipeInput) {
    return {
      name: input.name,
      description: input.description,
      author: input.author,
      servings: input.servings,
      difficulty: input.difficulty,
      notes: input.notes,
      steps: { create: input.steps },
      ingredients: { create: input.ingredients },
    };
  }
}
