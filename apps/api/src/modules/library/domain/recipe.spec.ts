import { describe, expect, it } from 'vitest';
import { RecipeDraft, type MamboConfiguration } from './recipe.js';

describe('RecipeDraft', () => {
  const mamboDraft = (mambo?: MamboConfiguration | null) =>
    new RecipeDraft({
      name: 'Mambo',
      ingredients: [],
      steps: [{ position: 0, text: 'Cocinar', mambo }],
    }).value.steps[0].mambo;

  it.each([
    undefined,
    null,
    {},
    { observations: '  ' },
    { speed: null, ct: null },
  ])('normalizes empty Mambo configurations to null: %j', (mambo) => {
    expect(mamboDraft(mambo)).toBeNull();
  });

  it('preserves zero, the PostgreSQL integer maximum and observations', () => {
    expect(
      mamboDraft({
        speed: 0,
        temperature: 0,
        ct: 0,
        durationSeconds: 2147483647,
        observations: ' Vapor ',
      }),
    ).toEqual({
      speed: 0,
      temperature: 0,
      ct: 0,
      durationSeconds: 2147483647,
      observations: 'Vapor',
    });
    expect(mamboDraft({ observations: 'Sin cuchillas' })).toEqual({
      speed: null,
      temperature: null,
      ct: null,
      durationSeconds: null,
      observations: 'Sin cuchillas',
    });
  });

  it.each([[], ['invalid'], 'invalid', 0, true])(
    'rejects non-object Mambo configuration: %j',
    (value) => {
      expect(() => mamboDraft(value as unknown as MamboConfiguration)).toThrow(
        'must be an object',
      );
    },
  );

  it('rejects non-string Mambo observations', () => {
    expect(() =>
      mamboDraft({ observations: 3 } as unknown as MamboConfiguration),
    ).toThrow('must be a string');
  });

  for (const key of [
    'speed',
    'temperature',
    'ct',
    'durationSeconds',
  ] as const) {
    it.each([-1, 0.5, 2147483648, NaN, Infinity, '', '0', true])(
      `rejects invalid Mambo ${key}: %j`,
      (value) => {
        expect(() => mamboDraft({ [key]: value })).toThrow(
          'must be an integer',
        );
      },
    );
  }

  it('accepts repeated ingredient uses and exact optional decimals', () => {
    const draft = new RecipeDraft({
      name: ' Tarta ',
      steps: [{ position: 0, text: 'Mezclar' }],
      ingredients: [
        {
          position: 0,
          ingredientId: 'butter',
          quantity: '100.125',
          optional: false,
        },
        { position: 1, ingredientId: 'butter', optional: false },
      ],
    });
    expect(draft.value.name).toBe('Tarta');
    expect(draft.value.ingredients).toHaveLength(2);
  });

  it('rejects repeated positions', () => {
    expect(
      () =>
        new RecipeDraft({
          name: 'Tarta',
          steps: [
            { position: 0, text: 'Uno' },
            { position: 0, text: 'Dos' },
          ],
          ingredients: [],
        }),
    ).toThrow('positions must be unique');
  });

  it('rejects imprecise quantity input', () => {
    expect(
      () =>
        new RecipeDraft({
          name: 'Tarta',
          steps: [],
          ingredients: [
            {
              position: 0,
              ingredientId: 'salt',
              quantity: '0.0001',
              optional: false,
            },
          ],
        }),
    ).toThrow('up to 3 decimals');
  });

  it('rejects duplicate category and tag relations', () => {
    expect(
      () =>
        new RecipeDraft({
          name: 'Tarta',
          steps: [],
          ingredients: [],
          categoryIds: ['a', 'a'],
        }),
    ).toThrow('Categories must be unique');
    expect(
      () =>
        new RecipeDraft({
          name: 'Tarta',
          steps: [],
          ingredients: [],
          tagIds: ['a', 'a'],
        }),
    ).toThrow('Tags must be unique');
  });
});
