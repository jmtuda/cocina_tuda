import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  RecipeSearchQuery,
  RecipeSearchResult,
  RecipeSummary,
  SearchRepository,
} from '../application/search.repository.js';

const summaryInclude = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
};

type PersistedSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  categories: Array<{ category: { id: string; name: string } }>;
  tags: Array<{ tag: { id: string; name: string } }>;
};

const toSummary = (recipe: PersistedSummary): RecipeSummary => ({
  id: recipe.id,
  name: recipe.name,
  description: recipe.description,
  status: recipe.status,
  categories: recipe.categories.map(({ category }) => ({
    id: category.id,
    name: category.name,
  })),
  tags: recipe.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })),
});

const normalizeSearchText = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');

@Injectable()
export class PrismaSearchRepository implements SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: RecipeSearchQuery): Promise<RecipeSearchResult> {
    if (query.text || query.ingredientIds.length || query.variantIds.length) {
      return this.advancedSearch(query);
    }
    const where = {
      status: { in: query.statuses },
      ...(query.categoryIds.length
        ? { categories: { some: { categoryId: { in: query.categoryIds } } } }
        : {}),
      ...(query.tagIds.length
        ? { tags: { some: { tagId: { in: query.tagIds } } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where,
        orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: summaryInclude,
      }),
      this.prisma.recipe.count({ where }),
    ]);
    return this.result(
      items.map((item) => toSummary(item as PersistedSummary)),
      query,
      total,
    );
  }

  private async advancedSearch(query: RecipeSearchQuery) {
    const rows = await this.searchRows(
      query,
      (query.page - 1) * query.pageSize,
      query.pageSize,
    );
    const total = rows.length
      ? Number(rows[0]?.total ?? 0n)
      : query.page > 1
        ? Number((await this.searchRows(query, 0, 1))[0]?.total ?? 0n)
        : 0;
    const ids = rows.map((row) => row.id);
    const found = ids.length
      ? await this.prisma.recipe.findMany({
          where: { id: { in: ids } },
          include: summaryInclude,
        })
      : [];
    const byId = new Map(
      found.map((recipe) => [recipe.id, toSummary(recipe as PersistedSummary)]),
    );
    return this.result(
      ids.flatMap((id) => {
        const recipe = byId.get(id);
        return recipe ? [recipe] : [];
      }),
      query,
      total,
    );
  }

  private result(
    items: RecipeSummary[],
    query: RecipeSearchQuery,
    total: number,
  ): RecipeSearchResult {
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private searchRows(query: RecipeSearchQuery, offset: number, limit: number) {
    const normalizedQuery = normalizeSearchText(query.text);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const tokenArray = tokens.length
      ? Prisma.sql`ARRAY[${Prisma.join(tokens)}]::text[]`
      : Prisma.sql`ARRAY[]::text[]`;
    const baseWhere = Prisma.sql`
      r.status IN (${Prisma.join(query.statuses.map((status) => Prisma.sql`${status}::"RecipeStatus"`))})
      ${query.categoryIds.length ? Prisma.sql`AND EXISTS (SELECT 1 FROM recipe_categories rc WHERE rc.recipe_id = r.id AND rc.category_id IN (${Prisma.join(query.categoryIds.map((id) => Prisma.sql`${id}::uuid`))}))` : Prisma.empty}
      ${query.tagIds.length ? Prisma.sql`AND EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_id IN (${Prisma.join(query.tagIds.map((id) => Prisma.sql`${id}::uuid`))}))` : Prisma.empty}
      ${
        query.ingredientIds.length
          ? Prisma.join(
              query.ingredientIds.map(
                (id) =>
                  Prisma.sql`AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.ingredient_id = ${id}::uuid)`,
              ),
              ' ',
            )
          : Prisma.empty
      }
      ${
        query.variantIds.length
          ? Prisma.join(
              query.variantIds.map(
                (id) =>
                  Prisma.sql`AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.variant_id = ${id}::uuid)`,
              ),
              ' ',
            )
          : Prisma.empty
      }`;
    const textMatch = tokens.length
      ? Prisma.sql`WHERE NOT EXISTS (
          SELECT 1 FROM unnest(${tokenArray}) AS sought(token)
          WHERE s.search_name NOT LIKE '%' || sought.token || '%'
            AND s.search_description NOT LIKE '%' || sought.token || '%'
            AND s.search_ingredients NOT LIKE '%' || sought.token || '%'
            AND s.search_categories NOT LIKE '%' || sought.token || '%'
            AND s.search_tags NOT LIKE '%' || sought.token || '%'
        )`
      : Prisma.empty;
    const relevance = tokens.length
      ? Prisma.sql`CASE
          WHEN s.search_name = ${normalizedQuery} THEN 1
          WHEN EXISTS (SELECT 1 FROM unnest(${tokenArray}) sought(token) WHERE s.search_name LIKE '%' || sought.token || '%') THEN 2
          WHEN EXISTS (SELECT 1 FROM unnest(${tokenArray}) sought(token) WHERE s.search_ingredients LIKE '%' || sought.token || '%') THEN 3
          WHEN EXISTS (SELECT 1 FROM unnest(${tokenArray}) sought(token) WHERE s.search_categories LIKE '%' || sought.token || '%' OR s.search_tags LIKE '%' || sought.token || '%') THEN 4
          WHEN EXISTS (SELECT 1 FROM unnest(${tokenArray}) sought(token) WHERE s.search_description LIKE '%' || sought.token || '%') THEN 5
          ELSE 6 END`
      : Prisma.sql`0`;
    return this.prisma.$queryRaw<
      Array<{ id: string; relevance: number; total: bigint }>
    >(Prisma.sql`
      WITH ingredient_text AS (
        SELECT ri.recipe_id,
          search_normalize(string_agg(i.name || ' ' || COALESCE(iv.name, ''), ' ')) AS value
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        LEFT JOIN ingredient_variants iv ON iv.id = ri.variant_id
        GROUP BY ri.recipe_id
      ), category_text AS (
        SELECT rc.recipe_id, search_normalize(string_agg(c.name, ' ')) AS value
        FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
        GROUP BY rc.recipe_id
      ), tag_text AS (
        SELECT rt.recipe_id, search_normalize(string_agg(t.name, ' ')) AS value
        FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
        GROUP BY rt.recipe_id
      ), searchable AS (
        SELECT r.id, r.normalized_name,
          search_normalize(r.name) AS search_name,
          search_normalize(COALESCE(r.description, '')) AS search_description,
          COALESCE(i.value, '') AS search_ingredients,
          COALESCE(c.value, '') AS search_categories,
          COALESCE(t.value, '') AS search_tags
        FROM recipes r
        LEFT JOIN ingredient_text i ON i.recipe_id = r.id
        LEFT JOIN category_text c ON c.recipe_id = r.id
        LEFT JOIN tag_text t ON t.recipe_id = r.id
        WHERE ${baseWhere}
      ), matched AS (
        SELECT s.id, s.normalized_name, ${relevance} AS relevance
        FROM searchable s ${textMatch}
      )
      SELECT id, relevance, COUNT(*) OVER ()::bigint AS total
      FROM matched
      ORDER BY relevance, normalized_name, id
      OFFSET ${offset}
      LIMIT ${limit}`);
  }
}
