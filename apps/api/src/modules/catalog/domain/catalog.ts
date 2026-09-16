export class CatalogName {
  readonly value: string;
  readonly normalized: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) throw new Error('Catalog name is required');
    this.value = trimmed;
    this.normalized = normalizeName(trimmed);
  }
}

export function normalizeName(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
}

export type Ingredient = {
  id: string;
  name: string;
  normalizedName: string;
};

export type IngredientVariant = {
  id: string;
  ingredientId: string;
  name: string;
  normalizedName: string;
};

export type Unit = {
  id: string;
  name: string;
  abbreviation: string;
  normalizedName: string;
};
