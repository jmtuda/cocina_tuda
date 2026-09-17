import type {
  InterpreterInput,
  RawRecipeProposal,
} from '../domain/import-proposal.js';

export const RECIPE_INTERPRETER = Symbol('RECIPE_INTERPRETER');

export interface RecipeInterpreter {
  interpret(input: InterpreterInput): Promise<RawRecipeProposal>;
}
