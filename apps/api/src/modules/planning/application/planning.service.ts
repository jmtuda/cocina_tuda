import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RECIPE_REFERENCE_READER,
  type RecipeReferenceReader,
} from '../../library/application/recipe-reference.reader.js';
import {
  isCalendarDate,
  normalizePlannedMeal,
  type PlannedMealInput,
} from '../domain/planned-meal.js';
import {
  PLANNING_REPOSITORY,
  type PlanningRepository,
} from './planning.repository.js';

@Injectable()
export class PlanningService {
  constructor(
    @Inject(PLANNING_REPOSITORY)
    private readonly repository: PlanningRepository,
    @Inject(RECIPE_REFERENCE_READER)
    private readonly recipes: RecipeReferenceReader,
  ) {}

  async create(input: PlannedMealInput) {
    const value = this.validate(input);
    await this.requireActiveRecipe(value.recipeId);
    return this.repository.create(value);
  }

  async list(from: string, to: string) {
    this.validateRange(from, to);
    return this.repository.findBetween(from, to);
  }

  async update(id: string, input: PlannedMealInput) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Planificación no encontrada');
    const value = this.validate(input);
    if (value.recipeId !== current.recipeId) {
      await this.requireActiveRecipe(value.recipeId);
    }
    const result = await this.repository.update(id, value);
    if (!result) throw new NotFoundException('Planificación no encontrada');
    return result;
  }

  async remove(id: string) {
    if (!(await this.repository.delete(id))) {
      throw new NotFoundException('Planificación no encontrada');
    }
  }

  private validate(input: PlannedMealInput) {
    try {
      return normalizePlannedMeal(input);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Planificación no válida',
      );
    }
  }

  private validateRange(from: string, to: string) {
    if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) {
      throw new BadRequestException('Intervalo de fechas no válido');
    }
    const days =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000;
    if (days > 366) {
      throw new BadRequestException('El intervalo no puede superar 367 días');
    }
  }

  private async requireActiveRecipe(recipeId: string) {
    const recipe = await this.recipes.findRecipeReference(recipeId);
    if (!recipe) throw new BadRequestException('La receta no existe');
    if (recipe.status !== 'ACTIVE') {
      throw new ConflictException(
        'Una receta archivada no admite nuevas planificaciones',
      );
    }
  }
}
