import type { NamedReference } from '../../library/application/recipe.repository.js';

export type RecipeSearchQuery = {
  page: number;
  pageSize: number;
  statuses: Array<'ACTIVE' | 'ARCHIVED'>;
  categoryIds: string[];
  tagIds: string[];
  text: string;
  ingredientIds: string[];
  variantIds: string[];
};

export type RecipeSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  categories: NamedReference[];
  tags: NamedReference[];
};

export type RecipeSearchResult = {
  items: RecipeSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export interface SearchRepository {
  search(query: RecipeSearchQuery): Promise<RecipeSearchResult>;
}
