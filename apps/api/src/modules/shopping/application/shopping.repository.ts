import type { GeneratedShoppingItem } from '../domain/shopping.js';

export type ShoppingItemInput = {
  ingredientId?: string | null;
  variantId?: string | null;
  manualName?: string | null;
  quantity?: string | null;
  unitId?: string | null;
  observations?: string | null;
  optional: boolean;
  purchased: boolean;
};

export type ShoppingItemRecord = ShoppingItemInput & {
  id: string;
  position: number;
  ingredient: { id: string; name: string } | null;
  variant: { id: string; name: string } | null;
  unit: { id: string; name: string; abbreviation: string } | null;
  sources: Array<{
    plannedMealId: string;
    recipeId: string;
    recipeName: string;
    plannedDate: string;
    recipeIngredientId: string;
  }>;
};

export type ShoppingListRecord = {
  id: string;
  name: string;
  sourceFrom: string | null;
  sourceTo: string | null;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sources: Array<{
    plannedMealId: string;
    recipeId: string;
    recipeName: string;
    plannedDate: string;
  }>;
  items: ShoppingItemRecord[];
};

export type GeneratedListInput = {
  name: string;
  from: string;
  to: string;
  sources: ShoppingListRecord['sources'];
  items: GeneratedShoppingItem[];
};

export const SHOPPING_REPOSITORY = Symbol('SHOPPING_REPOSITORY');

export interface ShoppingRepository {
  createGenerated(input: GeneratedListInput): Promise<ShoppingListRecord>;
  list(): Promise<ShoppingListRecord[]>;
  findById(id: string): Promise<ShoppingListRecord | null>;
  rename(id: string, name: string): Promise<ShoppingListRecord | null>;
  addItem(
    listId: string,
    input: ShoppingItemInput,
  ): Promise<ShoppingItemRecord | null>;
  updateItem(
    listId: string,
    itemId: string,
    input: ShoppingItemInput,
  ): Promise<ShoppingItemRecord | null>;
  deleteItem(listId: string, itemId: string): Promise<boolean>;
}
