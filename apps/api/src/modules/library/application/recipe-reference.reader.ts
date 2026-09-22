export type RecipeReference = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
};

export type ShoppingRecipeSnapshot = RecipeReference & {
  ingredients: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    variantId: string | null;
    variantName: string | null;
    quantity: string | null;
    unitId: string | null;
    unitName: string | null;
    unitAbbreviation: string | null;
    optional: boolean;
    observations: string | null;
  }>;
};

export const RECIPE_REFERENCE_READER = Symbol('RECIPE_REFERENCE_READER');

export interface RecipeReferenceReader {
  findRecipeReference(id: string): Promise<RecipeReference | null>;
  findShoppingRecipeSnapshot(
    id: string,
  ): Promise<ShoppingRecipeSnapshot | null>;
}
