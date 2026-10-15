import type { Ingredient, IngredientVariant, Unit } from '../domain/catalog.js';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogRepository {
  updateIngredient(
    id: string,
    name: string,
    normalizedName: string,
  ): Promise<Ingredient>;
  updateVariant(
    ingredientId: string,
    id: string,
    name: string,
    normalizedName: string,
  ): Promise<IngredientVariant>;
  updateUnit(
    id: string,
    name: string,
    abbreviation: string,
    normalizedName: string,
  ): Promise<Unit>;
  createIngredient(name: string, normalizedName: string): Promise<Ingredient>;
  createVariant(
    ingredientId: string,
    name: string,
    normalizedName: string,
  ): Promise<IngredientVariant>;
  createUnit(
    name: string,
    abbreviation: string,
    normalizedName: string,
  ): Promise<Unit>;
  listIngredients(): Promise<
    Array<Ingredient & { variants: IngredientVariant[] }>
  >;
  listUnits(): Promise<Unit[]>;
}
