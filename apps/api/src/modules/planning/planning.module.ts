import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module.js';
import { PLANNING_REPOSITORY } from './application/planning.repository.js';
import { PlanningService } from './application/planning.service.js';
import { PrismaPlanningRepository } from './infrastructure/prisma-planning.repository.js';
import { PlanningController } from './presentation/planning.controller.js';

@Module({
  imports: [LibraryModule],
  controllers: [PlanningController],
  providers: [
    PlanningService,
    { provide: PLANNING_REPOSITORY, useClass: PrismaPlanningRepository },
  ],
})
export class PlanningModule {}
