import { Inject, Injectable } from '@nestjs/common';
import {
  SEARCH_REPOSITORY,
  type RecipeSearchQuery,
  type SearchRepository,
} from './search.repository.js';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY) private readonly repository: SearchRepository,
  ) {}

  search(query: RecipeSearchQuery) {
    return this.repository.search(query);
  }
}
