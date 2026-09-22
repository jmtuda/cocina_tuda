import { Module } from '@nestjs/common';
import { RECIPE_REPOSITORY } from './application/recipe.repository.js';
import { RecipeService } from './application/recipe.service.js';
import { PrismaRecipeRepository } from './infrastructure/prisma-recipe.repository.js';
import { RecipeController } from './presentation/recipe.controller.js';
import { RECIPE_REFERENCE_READER } from './application/recipe-reference.reader.js';

@Module({
  controllers: [RecipeController],
  providers: [
    RecipeService,
    { provide: RECIPE_REFERENCE_READER, useExisting: RecipeService },
    { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },
  ],
  exports: [RecipeService, RECIPE_REFERENCE_READER],
})
export class LibraryModule {}
