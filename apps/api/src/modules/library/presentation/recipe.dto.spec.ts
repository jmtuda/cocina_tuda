import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SaveRecipeDto } from './recipe.dto.js';

const dto = (mambo: unknown) =>
  plainToInstance(SaveRecipeDto, {
    name: 'Mambo',
    ingredients: [],
    steps: [{ position: 0, text: 'Cocinar', mambo }],
  });

describe('Mambo step DTO validation', () => {
  it.each([
    undefined,
    null,
    {},
    { speed: null, observations: '' },
    {
      speed: 0,
      temperature: 2147483647,
      ct: 0,
      durationSeconds: 0,
      observations: 'Vapor',
    },
  ])(
    'accepts optional configuration and integer boundaries: %j',
    async (mambo) => {
      expect(await validate(dto(mambo))).toEqual([]);
    },
  );

  for (const field of ['speed', 'temperature', 'ct', 'durationSeconds']) {
    it.each([-1, 0.5, 2147483648, '', '0', true])(
      `rejects invalid ${field}: %j`,
      async (value) => {
        expect(await validate(dto({ [field]: value }))).not.toEqual([]);
      },
    );
  }

  it.each(['invalid', 0, { observations: 3 }])(
    'rejects invalid object or observations: %j',
    async (mambo) => {
      expect(await validate(dto(mambo))).not.toEqual([]);
    },
  );
});
