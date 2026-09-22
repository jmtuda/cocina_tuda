import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { LibraryModule } from '../library/library.module.js';
import { PlanningModule } from '../planning/planning.module.js';
import { SHOPPING_REPOSITORY } from './application/shopping.repository.js';
import { ShoppingService } from './application/shopping.service.js';
import { PrismaShoppingRepository } from './infrastructure/prisma-shopping.repository.js';
import { ShoppingController } from './presentation/shopping.controller.js';

@Module({
  imports: [PlanningModule, LibraryModule, CatalogModule],
  controllers: [ShoppingController],
  providers: [
    ShoppingService,
    { provide: SHOPPING_REPOSITORY, useClass: PrismaShoppingRepository },
  ],
})
export class ShoppingModule {}
