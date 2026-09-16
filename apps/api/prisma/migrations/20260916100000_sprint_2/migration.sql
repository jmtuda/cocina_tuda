ALTER TABLE "recipes" ADD COLUMN "normalized_name" TEXT;
UPDATE "recipes" SET "normalized_name" = translate(lower(regexp_replace(trim("name"), '\s+', ' ', 'g')), 'áéíóúüñ', 'aeiouun');
ALTER TABLE "recipes" ALTER COLUMN "normalized_name" SET NOT NULL;
CREATE INDEX "recipes_normalized_name_id_idx" ON "recipes"("normalized_name", "id");

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recipe_categories" (
  "recipe_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("recipe_id", "category_id")
);

CREATE TABLE "recipe_tags" (
  "recipe_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "recipe_tags_pkey" PRIMARY KEY ("recipe_id", "tag_id")
);

CREATE UNIQUE INDEX "categories_normalized_name_key" ON "categories"("normalized_name");
CREATE UNIQUE INDEX "tags_normalized_name_key" ON "tags"("normalized_name");
CREATE INDEX "recipe_categories_category_id_idx" ON "recipe_categories"("category_id");
CREATE INDEX "recipe_tags_tag_id_idx" ON "recipe_tags"("tag_id");
ALTER TABLE "recipe_categories" ADD CONSTRAINT "recipe_categories_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_categories" ADD CONSTRAINT "recipe_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_tags" ADD CONSTRAINT "recipe_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
