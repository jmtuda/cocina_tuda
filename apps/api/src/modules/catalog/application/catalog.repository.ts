import type { Ingredient, IngredientVariant, Unit } from '../domain/catalog.js';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogRepository {
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
  listIngredients(): Promise<Ingredient[]>;
  listUnits(): Promise<Unit[]>;
}
