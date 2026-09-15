import { describe, expect, it } from 'vitest';
import { CatalogName } from './catalog.js';

describe('CatalogName', () => {
  it('normalizes accents, case and whitespace for duplicate detection', () => {
    expect(new CatalogName('  TOMÁTE  cherry ').normalized).toBe(
      'tomate cherry',
    );
  });

  it('rejects empty names', () => {
    expect(() => new CatalogName('   ')).toThrow('required');
  });
});
