export type RecipeReference = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
};

export const RECIPE_REFERENCE_READER = Symbol('RECIPE_REFERENCE_READER');

export interface RecipeReferenceReader {
  findRecipeReference(id: string): Promise<RecipeReference | null>;
}
