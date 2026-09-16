export type RecipeStepInput = { position: number; text: string };
export type RecipeIngredientInput = {
  position: number;
  ingredientId: string;
  variantId?: string;
  quantity?: string;
  unitId?: string;
  optional: boolean;
  observations?: string;
};

export type RecipeInput = {
  name: string;
  description?: string;
  author?: string;
  servings?: number;
  difficulty?: string;
  notes?: string;
  steps: RecipeStepInput[];
  ingredients: RecipeIngredientInput[];
  categoryIds?: string[];
  tagIds?: string[];
};

export class RecipeDraft {
  readonly value: RecipeInput;

  constructor(input: RecipeInput) {
    const name = input.name.trim();
    if (!name) throw new Error('Recipe name is required');
    this.assertUniquePositions(input.steps, 'step');
    this.assertUniquePositions(input.ingredients, 'ingredient');
    if (
      new Set(input.categoryIds ?? []).size !== (input.categoryIds ?? []).length
    )
      throw new Error('Categories must be unique');
    if (new Set(input.tagIds ?? []).size !== (input.tagIds ?? []).length)
      throw new Error('Tags must be unique');
    for (const ingredient of input.ingredients) {
      if (
        ingredient.quantity !== undefined &&
        !/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(ingredient.quantity)
      ) {
        throw new Error(
          'Quantity must be a non-negative decimal with up to 3 decimals',
        );
      }
    }
    this.value = { ...input, name };
  }

  private assertUniquePositions(
    values: Array<{ position: number }>,
    label: string,
  ) {
    const positions = new Set<number>();
    for (const value of values) {
      if (!Number.isInteger(value.position) || value.position < 0) {
        throw new Error(`${label} position must be a non-negative integer`);
      }
      if (positions.has(value.position)) {
        throw new Error(`${label} positions must be unique`);
      }
      positions.add(value.position);
    }
  }
}
