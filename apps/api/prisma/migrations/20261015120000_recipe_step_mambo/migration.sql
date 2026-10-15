-- Optional Mambo configuration belongs to its step; no historical data conversion.
ALTER TABLE "recipe_steps"
  ADD COLUMN "mambo_speed" INTEGER,
  ADD COLUMN "mambo_temperature" INTEGER,
  ADD COLUMN "mambo_ct" INTEGER,
  ADD COLUMN "mambo_duration_seconds" INTEGER,
  ADD COLUMN "mambo_observations" TEXT,
  ADD CONSTRAINT "recipe_steps_mambo_speed_nonnegative" CHECK ("mambo_speed" >= 0),
  ADD CONSTRAINT "recipe_steps_mambo_temperature_nonnegative" CHECK ("mambo_temperature" >= 0),
  ADD CONSTRAINT "recipe_steps_mambo_ct_nonnegative" CHECK ("mambo_ct" >= 0),
  ADD CONSTRAINT "recipe_steps_mambo_duration_nonnegative" CHECK ("mambo_duration_seconds" >= 0);