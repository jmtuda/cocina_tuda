import type { RecipeInput } from '../domain/recipe.js';

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');

export interface RecipeRepository {
  create(input: RecipeInput): Promise<object>;
  findById(id: string): Promise<object | null>;
  update(id: string, input: RecipeInput): Promise<object | null>;
  archive(id: string): Promise<object | null>;
}
