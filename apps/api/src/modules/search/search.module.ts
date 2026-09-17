import { Module } from '@nestjs/common';
import { SEARCH_REPOSITORY } from './application/search.repository.js';
import { SearchService } from './application/search.service.js';
import { PrismaSearchRepository } from './infrastructure/prisma-search.repository.js';
import { SearchController } from './presentation/search.controller.js';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    { provide: SEARCH_REPOSITORY, useClass: PrismaSearchRepository },
  ],
  exports: [SearchService],
})
export class SearchModule {}
