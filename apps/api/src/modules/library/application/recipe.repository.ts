import type { RecipeInput } from '../domain/recipe.js';

export type NamedReference = { id: string; name: string };
export type RecipeRecord = {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  steps: Array<{ id: string; position: number; text: string }>;
  ingredients: Array<{
    id: string;
    position: number;
    ingredientId: string;
    variantId: string | null;
    quantity: string | null;
    unitId: string | null;
    optional: boolean;
    observations: string | null;
    ingredient: NamedReference;
    variant: NamedReference | null;
    unit: (NamedReference & { abbreviation: string }) | null;
  }>;
  categories: NamedReference[];
  tags: NamedReference[];
};

export const RECIPE_REPOSITORY = Symbol('RECIPE_REPOSITORY');

export interface RecipeRepository {
  create(input: RecipeInput): Promise<RecipeRecord>;
  findById(id: string): Promise<RecipeRecord | null>;
  update(id: string, input: RecipeInput): Promise<RecipeRecord | null>;
  archive(id: string): Promise<RecipeRecord | null>;
  restore(id: string): Promise<RecipeRecord | null>;
}
