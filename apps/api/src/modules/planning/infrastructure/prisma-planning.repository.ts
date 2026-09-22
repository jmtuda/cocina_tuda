import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  PlannedMealRecord,
  PlanningRepository,
} from '../application/planning.repository.js';
import {
  calendarDateToUtc,
  utcToCalendarDate,
  type PlannedMealInput,
} from '../domain/planned-meal.js';

const include = {
  recipe: { select: { id: true, name: true, status: true } },
};

type PersistedMeal = {
  id: string;
  recipeId: string;
  plannedDate: Date;
  mealName: string | null;
  createdAt: Date;
  updatedAt: Date;
  recipe: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'ARCHIVED';
  };
};

const toRecord = (meal: PersistedMeal): PlannedMealRecord => ({
  id: meal.id,
  recipeId: meal.recipeId,
  plannedDate: utcToCalendarDate(meal.plannedDate),
  mealName: meal.mealName,
  createdAt: meal.createdAt,
  updatedAt: meal.updatedAt,
  recipe: meal.recipe,
});

@Injectable()
export class PrismaPlanningRepository implements PlanningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: PlannedMealInput) {
    const result = await this.prisma.plannedMeal.create({
      data: this.data(input),
      include,
    });
    return toRecord(result);
  }

  async findById(id: string) {
    const result = await this.prisma.plannedMeal.findUnique({
      where: { id },
      include,
    });
    return result ? toRecord(result) : null;
  }

  async findBetween(from: string, to: string) {
    const results = await this.prisma.plannedMeal.findMany({
      where: {
        plannedDate: {
          gte: calendarDateToUtc(from),
          lte: calendarDateToUtc(to),
        },
      },
      orderBy: [{ plannedDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include,
    });
    return results.map(toRecord);
  }

  async update(id: string, input: PlannedMealInput) {
    const exists = await this.prisma.plannedMeal.findUnique({ where: { id } });
    if (!exists) return null;
    const result = await this.prisma.plannedMeal.update({
      where: { id },
      data: this.data(input),
      include,
    });
    return toRecord(result);
  }

  async delete(id: string) {
    const result = await this.prisma.plannedMeal.deleteMany({ where: { id } });
    return result.count > 0;
  }

  private data(input: PlannedMealInput) {
    return {
      recipeId: input.recipeId,
      plannedDate: calendarDateToUtc(input.plannedDate),
      mealName: input.mealName ?? null,
    };
  }
}
