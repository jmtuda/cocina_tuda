import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LibraryModule } from '../library/library.module.js';
import { ImportService } from './application/import.service.js';
import { RECIPE_INTERPRETER } from './application/recipe-interpreter.js';
import { SOURCE_EXTRACTOR } from './application/source-extractor.js';
import { DefaultSourceExtractor } from './infrastructure/default-source-extractor.js';
import { OpenAiRecipeInterpreter } from './infrastructure/openai-recipe-interpreter.js';
import { ImportController } from './presentation/import.controller.js';

@Module({
  imports: [CatalogModule, LibraryModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    { provide: SOURCE_EXTRACTOR, useClass: DefaultSourceExtractor },
    { provide: RECIPE_INTERPRETER, useClass: OpenAiRecipeInterpreter },
  ],
})
export class ImportModule {}
