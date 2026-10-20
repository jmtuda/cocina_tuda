export type MamboConfiguration = {
  speed?: number | null;
  temperature?: number | null;
  ct?: number | null;
  durationSeconds?: number | null;
  observations?: string | null;
};

export type RecipeStepInput = {
  position: number;
  text: string;
  mambo?: MamboConfiguration | null;
};

export function normalizeMambo(
  input?: MamboConfiguration | null,
): MamboConfiguration | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Mambo configuration must be an object');
  }
  const result: MamboConfiguration = {};
  for (const key of [
    'speed',
    'temperature',
    'ct',
    'durationSeconds',
  ] as const) {
    const value = input[key];
    if (
      value != null &&
      (!Number.isInteger(value) || value < 0 || value > 2147483647)
    ) {
      throw new Error(
        `Mambo ${key} must be an integer between 0 and 2147483647`,
      );
    }
    result[key] = value ?? null;
  }
  if (input.observations != null && typeof input.observations !== 'string') {
    throw new Error('Mambo observations must be a string');
  }
  result.observations = input.observations?.trim() || null;
  return Object.values(result).every((value) => value === null) ? null : result;
}
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
  description?: string | null;
  author?: string | null;
  servings?: number | null;
  difficulty?: string | null;
  notes?: string | null;
  reviewed?: boolean;
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
    if (input.reviewed !== undefined && typeof input.reviewed !== 'boolean') {
      throw new Error('Reviewed must be a boolean');
    }
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
    this.value = {
      ...input,
      name,
      steps: input.steps.map((step) => ({
        ...step,
        mambo: normalizeMambo(step.mambo),
      })),
    };
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
