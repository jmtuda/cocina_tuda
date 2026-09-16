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
