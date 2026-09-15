CREATE TYPE "RecipeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "recipes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL,
  "description" TEXT, "author" TEXT, "servings" INTEGER, "difficulty" TEXT,
  "notes" TEXT, "status" "RecipeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "archived_at" TIMESTAMP(3),
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "recipe_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "recipe_id" UUID NOT NULL,
  "position" INTEGER NOT NULL, "text" TEXT NOT NULL,
  CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ingredients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ingredient_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ingredient_id" UUID NOT NULL,
  "name" TEXT NOT NULL, "normalized_name" TEXT NOT NULL,
  CONSTRAINT "ingredient_variants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL,
  "abbreviation" TEXT NOT NULL, "normalized_name" TEXT NOT NULL,
  CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "recipe_ingredients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "recipe_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL, "variant_id" UUID, "quantity" DECIMAL(12,3),
  "unit_id" UUID, "optional" BOOLEAN NOT NULL DEFAULT false,
  "observations" TEXT, "position" INTEGER NOT NULL,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipe_ingredients_quantity_check" CHECK ("quantity" IS NULL OR "quantity" >= 0)
);
CREATE UNIQUE INDEX "recipe_steps_recipe_id_position_key" ON "recipe_steps"("recipe_id", "position");
CREATE UNIQUE INDEX "ingredients_normalized_name_key" ON "ingredients"("normalized_name");
CREATE UNIQUE INDEX "ingredient_variants_ingredient_id_normalized_name_key" ON "ingredient_variants"("ingredient_id", "normalized_name");
CREATE UNIQUE INDEX "ingredient_variants_id_ingredient_id_key" ON "ingredient_variants"("id", "ingredient_id");
CREATE UNIQUE INDEX "units_normalized_name_key" ON "units"("normalized_name");
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_position_key" ON "recipe_ingredients"("recipe_id", "position");
CREATE INDEX "recipe_ingredients_variant_id_ingredient_id_idx" ON "recipe_ingredients"("variant_id", "ingredient_id");
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_variants" ADD CONSTRAINT "ingredient_variants_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_variant_id_ingredient_id_fkey" FOREIGN KEY ("variant_id", "ingredient_id") REFERENCES "ingredient_variants"("id", "ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
