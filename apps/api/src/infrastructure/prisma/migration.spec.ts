import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../prisma/migrations/20260915123000_sprint_1/migration.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);
const sprintTwoMigration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../prisma/migrations/20260916100000_sprint_2/migration.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);
const sprintThreeMigration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../prisma/migrations/20260916180000_sprint_3_search/migration.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);
const sprintFiveMigration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../prisma/migrations/20260921190000_sprint_5_planning/migration.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);

describe('Sprint 1 migration contract', () => {
  it('stores optional quantities as exact decimals', () => {
    expect(migration).toContain('"quantity" DECIMAL(12,3)');
  });

  it('protects variant ownership with a composite foreign key', () => {
    expect(migration).toContain(
      'FOREIGN KEY ("variant_id", "ingredient_id") REFERENCES "ingredient_variants"("id", "ingredient_id")',
    );
  });

  it('does not make recipe and ingredient unique', () => {
    expect(migration).not.toMatch(
      /UNIQUE[^;]+recipe_id[^;]+ingredient_id[^;]+variant_id/i,
    );
  });
});

describe('Sprint 2 migration contract', () => {
  it('creates flat category and tag relations without classification cascades', () => {
    expect(sprintTwoMigration).toContain('CREATE TABLE "recipe_categories"');
    expect(sprintTwoMigration).toContain('CREATE TABLE "recipe_tags"');
    expect(sprintTwoMigration).toContain(
      'REFERENCES "categories"("id") ON DELETE RESTRICT',
    );
    expect(sprintTwoMigration).toContain(
      'REFERENCES "tags"("id") ON DELETE RESTRICT',
    );
  });

  it('adds normalized recipe ordering without rewriting Sprint 1 migration', () => {
    expect(sprintTwoMigration).toContain('"normalized_name"');
    expect(sprintTwoMigration).toContain('recipes_normalized_name_id_idx');
  });
});

describe('Sprint 3 migration contract', () => {
  it('provides accent-insensitive indexed partial search', () => {
    expect(sprintThreeMigration).toContain(
      'CREATE EXTENSION IF NOT EXISTS "unaccent"',
    );
    expect(sprintThreeMigration).toContain(
      'CREATE EXTENSION IF NOT EXISTS "pg_trgm"',
    );
    expect(sprintThreeMigration).toContain('FUNCTION search_normalize');
    expect(sprintThreeMigration).toContain('gin_trgm_ops');
  });

  it('indexes base ingredient and variant filters', () => {
    expect(sprintThreeMigration).toContain(
      'recipe_ingredients_ingredient_recipe_idx',
    );
    expect(sprintThreeMigration).toContain(
      'recipe_ingredients_variant_recipe_idx',
    );
  });
});

describe('Sprint 5 migration contract', () => {
  it('stores calendar days as DATE and preserves recipe references', () => {
    expect(sprintFiveMigration).toContain('"planned_date" DATE NOT NULL');
    expect(sprintFiveMigration).toContain(
      'REFERENCES "recipes"("id")\n    ON DELETE RESTRICT',
    );
  });

  it('allows exact duplicates and indexes range queries', () => {
    expect(sprintFiveMigration).not.toMatch(/UNIQUE[^;]+planned_date/i);
    expect(sprintFiveMigration).toContain('planned_meals_planned_date_id_idx');
  });
});
