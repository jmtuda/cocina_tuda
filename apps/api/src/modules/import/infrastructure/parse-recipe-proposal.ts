import { BadGatewayException } from '@nestjs/common';
import {
  isImportRecipeStep,
  type RawRecipeProposal,
} from '../domain/import-proposal.js';

export function parseRecipeProposal(output: string): RawRecipeProposal {
  try {
    const value: unknown = JSON.parse(output);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    const raw = value as Record<string, unknown>;
    for (const key of [
      'name',
      'description',
      'author',
      'difficulty',
      'notes',
    ]) {
      if (raw[key] !== null && typeof raw[key] !== 'string') throw new Error();
    }
    if (
      raw.servings !== null &&
      (typeof raw.servings !== 'number' ||
        !Number.isInteger(raw.servings) ||
        raw.servings < 1)
    )
      throw new Error();
    if (!Array.isArray(raw.steps) || !raw.steps.every(isImportRecipeStep))
      throw new Error();
    for (const key of ['categories', 'tags']) {
      if (
        !Array.isArray(raw[key]) ||
        !raw[key].every((item) => typeof item === 'string')
      )
        throw new Error();
    }
    if (
      raw.issues !== undefined &&
      (!Array.isArray(raw.issues) ||
        !raw.issues.every((item) => typeof item === 'string'))
    )
      throw new Error();
    if (
      !Array.isArray(raw.ingredients) ||
      !raw.ingredients.every((item: unknown) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          return false;
        const ingredient = item as Record<string, unknown>;
        return (
          typeof ingredient.optional === 'boolean' &&
          ['ingredient', 'variant', 'quantity', 'unit', 'observations'].every(
            (key) =>
              ingredient[key] === null || typeof ingredient[key] === 'string',
          )
        );
      })
    )
      throw new Error();
    return value as RawRecipeProposal;
  } catch {
    throw new BadGatewayException(
      'El proveedor devolvió una respuesta inválida',
    );
  }
}
