import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY } from './application/catalog.repository.js';
import { CatalogService } from './application/catalog.service.js';
import { CLASSIFICATION_REPOSITORY } from './application/classification.repository.js';
import { ClassificationService } from './application/classification.service.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository.js';
import { PrismaClassificationRepository } from './infrastructure/prisma-classification.repository.js';
import { CatalogController } from './presentation/catalog.controller.js';
import { ClassificationController } from './presentation/classification.controller.js';
import { CATALOG_REFERENCE_READER } from './application/catalog-reference.reader.js';

@Module({
  controllers: [CatalogController, ClassificationController],
  providers: [
    CatalogService,
    { provide: CATALOG_REFERENCE_READER, useExisting: CatalogService },
    ClassificationService,
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    {
      provide: CLASSIFICATION_REPOSITORY,
      useClass: PrismaClassificationRepository,
    },
  ],
  exports: [CatalogService, ClassificationService, CATALOG_REFERENCE_READER],
})
export class CatalogModule {}
