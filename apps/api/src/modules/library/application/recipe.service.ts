import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecipeDraft, type RecipeInput } from '../domain/recipe.js';
import {
  RECIPE_REPOSITORY,
  type RecipeRepository,
} from './recipe.repository.js';

@Injectable()
export class RecipeService {
  constructor(
    @Inject(RECIPE_REPOSITORY) private readonly repository: RecipeRepository,
  ) {}

  async create(input: RecipeInput) {
    try {
      return await this.repository.create(this.validate(input));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async get(id: string) {
    const recipe = await this.repository.findById(id);
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  async findRecipeReference(id: string) {
    const recipe = await this.repository.findById(id);
    return recipe
      ? { id: recipe.id, name: recipe.name, status: recipe.status }
      : null;
  }

  async update(id: string, input: RecipeInput) {
    try {
      const recipe = await this.repository.update(id, this.validate(input));
      if (!recipe) throw new NotFoundException('Receta no encontrada');
      return recipe;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePersistenceError(error);
    }
  }

  async archive(id: string) {
    const recipe = await this.repository.archive(id);
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  async restore(id: string) {
    const recipe = await this.repository.restore(id);
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  private validate(input: RecipeInput): RecipeInput {
    try {
      return new RecipeDraft(input).value;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Receta no válida',
      );
    }
  }

  private handlePersistenceError(error: unknown): never {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === 'P2003' || code === 'P2023') {
      throw new BadRequestException('Referencia de catálogo no válida');
    }
    if (code === 'P2025') throw new NotFoundException('Receta no encontrada');
    throw error;
  }
}
