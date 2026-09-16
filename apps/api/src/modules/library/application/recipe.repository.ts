import type { RecipeInput } from '../domain/recipe.js';

export type RecipeListQuery = {
  page: number;
  pageSize: number;
  statuses: Array<'ACTIVE' | 'ARCHIVED'>;
  categoryIds: string[];
  tagIds: string[];
  text: string;
  ingredientIds: string[];
  variantIds: string[];
};

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');

export interface RecipeRepository {
  create(input: RecipeInput): Promise<object>;
  findById(id: string): Promise<object | null>;
  update(id: string, input: RecipeInput): Promise<object | null>;
  archive(id: string): Promise<object | null>;
  restore(id: string): Promise<object | null>;
  list(query: RecipeListQuery): Promise<object>;
}
