import { describe, expect, it } from 'vitest';
import { RecipeDraft } from './recipe.js';

describe('RecipeDraft', () => {
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
