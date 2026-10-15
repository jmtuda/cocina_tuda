import type { MamboConfiguration } from '../../library/domain/recipe.js';

export type ImportRecipeStep =
  string | { text: string; mambo?: MamboConfiguration | null };

export function isImportRecipeStep(value: unknown): value is ImportRecipeStep {
  if (typeof value === 'string') return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const step = value as Record<string, unknown>;
  if (typeof step.text !== 'string') return false;
  if (Object.keys(step).some((key) => !['text', 'mambo'].includes(key)))
    return false;
  if (step.mambo == null) return true;
  if (typeof step.mambo !== 'object' || Array.isArray(step.mambo)) return false;
  return Object.entries(step.mambo).every(([key, item]) => {
    if (
      ![
        'speed',
        'temperature',
        'ct',
        'durationSeconds',
        'observations',
      ].includes(key)
    )
      return false;
    if (item == null) return true;
    if (key === 'observations') return typeof item === 'string';
    return (
      typeof item === 'number' &&
      Number.isInteger(item) &&
      item >= 0 &&
      item <= 2147483647
    );
  });
}

export type ImportSource =
  | { kind: 'text'; text: string }
  | {
      kind: 'file';
      filename: string;
      mimeType: string;
      dataBase64: string;
    };

export type InterpreterInput =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mimeType: string; dataBase64: string }
  | {
      kind: 'file';
      filename: string;
      mimeType: 'application/pdf';
      dataBase64: string;
    };

export type RawIngredientProposal = {
  ingredient: string | null;
  variant: string | null;
  quantity: string | null;
  unit: string | null;
  optional: boolean;
  observations: string | null;
};

export type RawRecipeProposal = {
  name: string | null;
  description: string | null;
  author: string | null;
  servings: number | null;
  difficulty: string | null;
  notes: string | null;
  steps: ImportRecipeStep[];
  issues?: string[];
  ingredients: RawIngredientProposal[];
  categories: string[];
  tags: string[];
};

export type Resolution = {
  status: 'matched' | 'ambiguous' | 'new' | 'unresolved';
  existingId?: string;
  proposedName?: string;
  suggestions: Array<{ id: string; name: string }>;
};

export type ResolvedIngredientProposal = RawIngredientProposal & {
  ingredientResolution: Resolution;
  variantResolution: Resolution | null;
  unitResolution: Resolution | null;
};

export type ResolvedRecipeProposal = Omit<
  RawRecipeProposal,
  'ingredients' | 'categories' | 'tags'
> & {
  ingredients: ResolvedIngredientProposal[];
  categories: Array<{ name: string; resolution: Resolution }>;
  tags: Array<{ name: string; resolution: Resolution }>;
  issues: string[];
};

export type ConfirmedReference = {
  existingId?: string;
  createName?: string;
  createAbbreviation?: string;
  discarded?: boolean;
};

export type ConfirmedIngredient = {
  ingredient: ConfirmedReference;
  variant: ConfirmedReference;
  quantity?: string;
  unit: ConfirmedReference;
  optional: boolean;
  observations?: string;
};

export type ConfirmedRecipeImport = {
  importId: string;
  name: string;
  description?: string | null;
  author?: string | null;
  servings?: number | null;
  difficulty?: string | null;
  notes?: string | null;
  steps: ImportRecipeStep[];
  ingredients: ConfirmedIngredient[];
  categories: ConfirmedReference[];
  tags: ConfirmedReference[];
};
