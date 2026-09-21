import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LibraryModule } from '../library/library.module.js';
import { ImportService } from './application/import.service.js';
import { RECIPE_INTERPRETER } from './application/recipe-interpreter.js';
import { SOURCE_EXTRACTOR } from './application/source-extractor.js';
import { DefaultSourceExtractor } from './infrastructure/default-source-extractor.js';
import { GeminiRecipeInterpreter } from './infrastructure/gemini-recipe-interpreter.js';
import { OpenAiRecipeInterpreter } from './infrastructure/openai-recipe-interpreter.js';
import { ImportController } from './presentation/import.controller.js';

@Module({
  imports: [CatalogModule, LibraryModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    { provide: SOURCE_EXTRACTOR, useClass: DefaultSourceExtractor },
    GeminiRecipeInterpreter,
    OpenAiRecipeInterpreter,
    {
      provide: RECIPE_INTERPRETER,
      inject: [GeminiRecipeInterpreter, OpenAiRecipeInterpreter],
      useFactory: (
        gemini: GeminiRecipeInterpreter,
        openAi: OpenAiRecipeInterpreter,
      ) =>
        (process.env['IMPORT_AI_PROVIDER'] ?? 'gemini') === 'openai'
          ? openAi
          : gemini,
    },
  ],
})
export class ImportModule {}
