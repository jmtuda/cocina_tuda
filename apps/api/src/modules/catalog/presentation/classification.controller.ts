import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassificationService } from '../application/classification.service.js';
import { CreateNamedCatalogItemDto } from './catalog.dto.js';

@ApiTags('classifications')
@Controller('classifications')
export class ClassificationController {
  constructor(private readonly service: ClassificationService) {}

  @Get('categories') listCategories() {
    return this.service.list('category');
  }
  @Post('categories') createCategory(@Body() body: CreateNamedCatalogItemDto) {
    return this.service.create('category', body.name);
  }
  @Patch('categories/:id') renameCategory(
    @Param('id') id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.service.rename('category', id, body.name);
  }
  @Delete('categories/:id') removeCategory(@Param('id') id: string) {
    return this.service.remove('category', id);
  }

  @Get('tags') listTags() {
    return this.service.list('tag');
  }
  @Post('tags') createTag(@Body() body: CreateNamedCatalogItemDto) {
    return this.service.create('tag', body.name);
  }
  @Patch('tags/:id') renameTag(
    @Param('id') id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.service.rename('tag', id, body.name);
  }
  @Delete('tags/:id') removeTag(@Param('id') id: string) {
    return this.service.remove('tag', id);
  }
}
