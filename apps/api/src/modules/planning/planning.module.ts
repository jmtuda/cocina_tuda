import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module.js';
import { PLANNING_REPOSITORY } from './application/planning.repository.js';
import { PlanningService } from './application/planning.service.js';
import { PrismaPlanningRepository } from './infrastructure/prisma-planning.repository.js';
import { PlanningController } from './presentation/planning.controller.js';
import { PLANNING_SOURCE_READER } from './application/planning-source.reader.js';

@Module({
  imports: [LibraryModule],
  controllers: [PlanningController],
  providers: [
    PlanningService,
    { provide: PLANNING_SOURCE_READER, useExisting: PlanningService },
    { provide: PLANNING_REPOSITORY, useClass: PrismaPlanningRepository },
  ],
  exports: [PLANNING_SOURCE_READER],
})
export class PlanningModule {}
