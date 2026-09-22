CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "source_from" DATE,
    "source_to" DATE,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_list_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopping_list_id" UUID NOT NULL,
    "planned_meal_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "recipe_name" TEXT NOT NULL,
    "planned_date" DATE NOT NULL,
    CONSTRAINT "shopping_list_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopping_list_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "ingredient_id" UUID,
    "variant_id" UUID,
    "manual_name" TEXT,
    "quantity" DECIMAL(12,3),
    "unit_id" UUID,
    "observations" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "shopping_items_identity_check" CHECK (("ingredient_id" IS NOT NULL AND "manual_name" IS NULL) OR ("ingredient_id" IS NULL AND "variant_id" IS NULL AND "manual_name" IS NOT NULL)),
    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_item_sources" (
    "shopping_item_id" UUID NOT NULL,
    "list_source_id" UUID NOT NULL,
    "recipe_ingredient_id" UUID NOT NULL,
    CONSTRAINT "shopping_item_sources_pkey" PRIMARY KEY ("shopping_item_id", "list_source_id", "recipe_ingredient_id")
);

CREATE INDEX "shopping_lists_created_at_id_idx" ON "shopping_lists"("created_at", "id");
CREATE UNIQUE INDEX "shopping_list_sources_shopping_list_id_planned_meal_id_key" ON "shopping_list_sources"("shopping_list_id", "planned_meal_id");
CREATE INDEX "shopping_list_sources_planned_meal_id_idx" ON "shopping_list_sources"("planned_meal_id");
CREATE UNIQUE INDEX "shopping_items_shopping_list_id_position_key" ON "shopping_items"("shopping_list_id", "position");
CREATE INDEX "shopping_items_ingredient_id_idx" ON "shopping_items"("ingredient_id");
CREATE INDEX "shopping_items_variant_id_ingredient_id_idx" ON "shopping_items"("variant_id", "ingredient_id");
CREATE INDEX "shopping_items_unit_id_idx" ON "shopping_items"("unit_id");
CREATE INDEX "shopping_item_sources_list_source_id_idx" ON "shopping_item_sources"("list_source_id");

ALTER TABLE "shopping_list_sources" ADD CONSTRAINT "shopping_list_sources_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_variant_id_ingredient_id_fkey" FOREIGN KEY ("variant_id", "ingredient_id") REFERENCES "ingredient_variants"("id", "ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shopping_item_sources" ADD CONSTRAINT "shopping_item_sources_shopping_item_id_fkey" FOREIGN KEY ("shopping_item_id") REFERENCES "shopping_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_item_sources" ADD CONSTRAINT "shopping_item_sources_list_source_id_fkey" FOREIGN KEY ("list_source_id") REFERENCES "shopping_list_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
