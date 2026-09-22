CREATE TABLE "planned_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "planned_date" DATE NOT NULL,
    "meal_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "planned_meals_planned_date_id_idx"
    ON "planned_meals"("planned_date", "id");

CREATE INDEX "planned_meals_recipe_id_idx"
    ON "planned_meals"("recipe_id");

ALTER TABLE "planned_meals"
    ADD CONSTRAINT "planned_meals_recipe_id_fkey"
    FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
