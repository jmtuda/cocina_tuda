import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { LibraryModule } from './modules/library/library.module.js';
import { SearchModule } from './modules/search/search.module.js';

@Module({
  imports: [PrismaModule, CatalogModule, LibraryModule, SearchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
