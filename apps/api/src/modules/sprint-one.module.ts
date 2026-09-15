import { Module } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service.js';
import { CATALOG_REPOSITORY } from './catalog/application/catalog.repository.js';
import { CatalogService } from './catalog/application/catalog.service.js';
import { PrismaCatalogRepository } from './catalog/infrastructure/prisma-catalog.repository.js';
import { CatalogController } from './catalog/presentation/catalog.controller.js';
import { RECIPE_REPOSITORY } from './library/application/recipe.repository.js';
import { RecipeService } from './library/application/recipe.service.js';
import { PrismaRecipeRepository } from './library/infrastructure/prisma-recipe.repository.js';
import { RecipeController } from './library/presentation/recipe.controller.js';

@Module({
  controllers: [CatalogController, RecipeController],
  providers: [
    PrismaService,
    CatalogService,
    RecipeService,
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepository },
  ],
})
export class SprintOneModule {}
