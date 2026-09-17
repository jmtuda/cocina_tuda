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
  steps: string[];
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
};

export type ConfirmedIngredient = {
  ingredient: ConfirmedReference;
  variant?: ConfirmedReference;
  quantity?: string;
  unit?: ConfirmedReference;
  optional: boolean;
  observations?: string;
};

export type ConfirmedRecipeImport = {
  name: string;
  description?: string | null;
  author?: string | null;
  servings?: number | null;
  difficulty?: string | null;
  notes?: string | null;
  steps: string[];
  ingredients: ConfirmedIngredient[];
  categories: ConfirmedReference[];
  tags: ConfirmedReference[];
};
