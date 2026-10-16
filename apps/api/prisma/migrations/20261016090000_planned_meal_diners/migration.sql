ALTER TABLE "planned_meals" ADD COLUMN "diners" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_diners_positive" CHECK ("diners" >= 1);
