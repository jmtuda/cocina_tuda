export type ShoppingCatalogReference = {
  ingredientId: string;
  ingredientName: string;
  variantId: string | null;
  variantName: string | null;
  unitId: string | null;
  unitName: string | null;
  unitAbbreviation: string | null;
};

export const CATALOG_REFERENCE_READER = Symbol('CATALOG_REFERENCE_READER');

export interface CatalogReferenceReader {
  findShoppingCatalogReference(input: {
    ingredientId: string;
    variantId?: string | null;
    unitId?: string | null;
  }): Promise<ShoppingCatalogReference | null>;
  findShoppingUnitReference(
    unitId: string,
  ): Promise<{ id: string; name: string; abbreviation: string } | null>;
}
