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
