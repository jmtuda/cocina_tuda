import type {
  ImportSource,
  InterpreterInput,
} from '../domain/import-proposal.js';

export const SOURCE_EXTRACTOR = Symbol('SOURCE_EXTRACTOR');

export interface SourceExtractor {
  extract(source: ImportSource): Promise<InterpreterInput>;
}
