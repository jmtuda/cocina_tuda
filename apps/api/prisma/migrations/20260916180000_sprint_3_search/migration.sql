CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION search_normalize(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$ SELECT lower(public.unaccent('public.unaccent', value)) $$;

CREATE INDEX "recipes_search_name_trgm_idx" ON "recipes" USING GIN (search_normalize("name") gin_trgm_ops);
CREATE INDEX "recipes_search_description_trgm_idx" ON "recipes" USING GIN (search_normalize(COALESCE("description", '')) gin_trgm_ops);
CREATE INDEX "ingredients_search_name_trgm_idx" ON "ingredients" USING GIN (search_normalize("name") gin_trgm_ops);
CREATE INDEX "ingredient_variants_search_name_trgm_idx" ON "ingredient_variants" USING GIN (search_normalize("name") gin_trgm_ops);
CREATE INDEX "categories_search_name_trgm_idx" ON "categories" USING GIN (search_normalize("name") gin_trgm_ops);
CREATE INDEX "tags_search_name_trgm_idx" ON "tags" USING GIN (search_normalize("name") gin_trgm_ops);
CREATE INDEX "recipe_ingredients_ingredient_recipe_idx" ON "recipe_ingredients"("ingredient_id", "recipe_id");
CREATE INDEX "recipe_ingredients_variant_recipe_idx" ON "recipe_ingredients"("variant_id", "recipe_id") WHERE "variant_id" IS NOT NULL;
