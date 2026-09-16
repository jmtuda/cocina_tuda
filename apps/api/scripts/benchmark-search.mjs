import { performance } from 'node:perf_hooks';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = new pg.Client({ connectionString });
await client.connect();
await client.query(`
  TRUNCATE recipe_tags, recipe_categories, recipe_ingredients, recipe_steps,
    recipes, ingredient_variants, ingredients, units, categories, tags CASCADE;

  INSERT INTO ingredients (name, normalized_name, updated_at)
  SELECT 'Ingrediente ' || n || CASE WHEN n % 20 = 0 THEN ' tomate' ELSE '' END,
         'ingrediente ' || n || CASE WHEN n % 20 = 0 THEN ' tomate' ELSE '' END,
         now()
  FROM generate_series(1, 250) n;

  INSERT INTO ingredient_variants (ingredient_id, name, normalized_name)
  SELECT i.id, 'Variante ' || v, 'variante ' || v
  FROM ingredients i CROSS JOIN generate_series(1, 2) v;

  INSERT INTO categories (name, normalized_name)
  SELECT 'Categoría ' || n, 'categoria ' || n FROM generate_series(1, 30) n;
  INSERT INTO tags (name, normalized_name)
  SELECT CASE WHEN n % 10 = 0 THEN 'Rápida ' || n ELSE 'Etiqueta ' || n END,
         CASE WHEN n % 10 = 0 THEN 'rapida ' || n ELSE 'etiqueta ' || n END
  FROM generate_series(1, 80) n;

  INSERT INTO recipes (name, normalized_name, description, updated_at)
  SELECT 'Receta ' || n || CASE WHEN n % 7 = 0 THEN ' Mediterránea' ELSE '' END,
         'receta ' || n || CASE WHEN n % 7 = 0 THEN ' mediterranea' ELSE '' END,
         CASE WHEN n % 11 = 0 THEN 'Preparación rápida con sabor casero' ELSE 'Descripción de cocina diaria número ' || n END,
         now()
  FROM generate_series(1, 10000) n;

  WITH r AS (
    SELECT id, row_number() OVER (ORDER BY normalized_name) AS rn FROM recipes
  ), i AS (
    SELECT array_agg(id ORDER BY normalized_name) AS ids FROM ingredients
  )
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, variant_id, position)
  SELECT r.id, i.ids[((r.rn + p) % 250 + 1)::int],
         CASE WHEN p % 2 = 0 THEN (
           SELECT iv.id FROM ingredient_variants iv
           WHERE iv.ingredient_id = i.ids[((r.rn + p) % 250 + 1)::int]
           ORDER BY iv.normalized_name LIMIT 1
         ) END,
         p
  FROM r CROSS JOIN i CROSS JOIN generate_series(0, 4) p;

  WITH r AS (
    SELECT id, row_number() OVER (ORDER BY normalized_name) AS rn FROM recipes
  ), c AS (
    SELECT array_agg(id ORDER BY normalized_name) AS ids FROM categories
  )
  INSERT INTO recipe_categories (recipe_id, category_id)
  SELECT r.id, c.ids[((r.rn + p) % 30 + 1)::int]
  FROM r CROSS JOIN c CROSS JOIN generate_series(0, 1) p;

  WITH r AS (
    SELECT id, row_number() OVER (ORDER BY normalized_name) AS rn FROM recipes
  ), t AS (
    SELECT array_agg(id ORDER BY normalized_name) AS ids FROM tags
  )
  INSERT INTO recipe_tags (recipe_id, tag_id)
  SELECT r.id, t.ids[((r.rn + p) % 80 + 1)::int]
  FROM r CROSS JOIN t CROSS JOIN generate_series(0, 2) p;

  ANALYZE;
`);

const ingredientRows = await client.query(
  'SELECT id FROM ingredients ORDER BY normalized_name LIMIT 2',
);
const variantRows = await client.query(
  'SELECT id FROM ingredient_variants ORDER BY normalized_name LIMIT 1',
);
const categoryRows = await client.query(
  'SELECT id FROM categories ORDER BY normalized_name LIMIT 1',
);
const tagRows = await client.query(
  'SELECT id FROM tags ORDER BY normalized_name LIMIT 1',
);
await client.end();

const { PrismaService } =
  await import('../dist/infrastructure/prisma/prisma.service.js');
const { PrismaRecipeRepository } =
  await import('../dist/modules/library/infrastructure/prisma-recipe.repository.js');
const prisma = new PrismaService();
const repository = new PrismaRecipeRepository(prisma);
const base = {
  page: 1,
  pageSize: 20,
  statuses: ['ACTIVE'],
  categoryIds: [],
  tagIds: [],
  text: '',
  ingredientIds: [],
  variantIds: [],
};
const workloads = [
  { ...base, text: 'receta mediterranea' },
  { ...base, text: 'tomate rápida' },
  { ...base, text: 'descripción cocina' },
  { ...base, ingredientIds: ingredientRows.rows.map((row) => row.id) },
  { ...base, variantIds: [variantRows.rows[0].id] },
  {
    ...base,
    text: 'receta',
    categoryIds: [categoryRows.rows[0].id],
    tagIds: [tagRows.rows[0].id],
  },
];

for (let index = 0; index < 18; index += 1)
  await repository.list(workloads[index % workloads.length]);

const durations = [];
for (let index = 0; index < 120; index += 1) {
  const start = performance.now();
  await repository.list(workloads[index % workloads.length]);
  durations.push(performance.now() - start);
}
await prisma.$disconnect();
durations.sort((left, right) => left - right);
const percentile = (value) =>
  durations[Math.ceil((value / 100) * durations.length) - 1];
const result = {
  recipes: 10000,
  ingredientsPerRecipe: 5,
  categoriesPerRecipe: 2,
  tagsPerRecipe: 3,
  warmupQueries: 18,
  measuredQueries: durations.length,
  p50Ms: Number(percentile(50).toFixed(2)),
  p95Ms: Number(percentile(95).toFixed(2)),
  maxMs: Number(durations.at(-1).toFixed(2)),
  targetP95Ms: 300,
};
console.log(JSON.stringify(result, null, 2));
if (result.p95Ms > result.targetP95Ms) process.exitCode = 1;
