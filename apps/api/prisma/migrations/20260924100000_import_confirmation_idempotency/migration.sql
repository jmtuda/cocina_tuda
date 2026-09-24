CREATE TABLE "import_confirmations" (
    "import_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_confirmations_pkey" PRIMARY KEY ("import_id")
);

CREATE UNIQUE INDEX "import_confirmations_recipe_id_key" ON "import_confirmations"("recipe_id");

ALTER TABLE "import_confirmations"
ADD CONSTRAINT "import_confirmations_recipe_id_fkey"
FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
