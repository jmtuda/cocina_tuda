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

  create(input: RecipeInput) {
    return this.repository.create(this.validate(input));
  }

  async get(id: string) {
    const recipe = await this.repository.findById(id);
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  async update(id: string, input: RecipeInput) {
    const recipe = await this.repository.update(id, this.validate(input));
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  async archive(id: string) {
    const recipe = await this.repository.archive(id);
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
}
