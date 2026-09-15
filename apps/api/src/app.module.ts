import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SprintOneModule } from './modules/sprint-one.module.js';

@Module({
  imports: [SprintOneModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
