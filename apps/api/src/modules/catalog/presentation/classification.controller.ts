import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ClassificationService } from '../application/classification.service.js';
import { CreateNamedCatalogItemDto } from './catalog.dto.js';
import { CatalogItemDto, DeletedResponseDto } from './catalog-response.dto.js';

@ApiTags('classifications')
@Controller('classifications')
export class ClassificationController {
  constructor(private readonly service: ClassificationService) {}

  @Get('categories')
  @ApiOkResponse({ type: [CatalogItemDto] })
  listCategories() {
    return this.service.list('category');
  }
  @Post('categories')
  @ApiCreatedResponse({ type: CatalogItemDto })
  createCategory(@Body() body: CreateNamedCatalogItemDto) {
    return this.service.create('category', body.name);
  }
  @Patch('categories/:id')
  @ApiOkResponse({ type: CatalogItemDto })
  renameCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.service.rename('category', id, body.name);
  }
  @Delete('categories/:id')
  @ApiOkResponse({ type: DeletedResponseDto })
  removeCategory(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.remove('category', id);
  }

  @Get('tags')
  @ApiOkResponse({ type: [CatalogItemDto] })
  listTags() {
    return this.service.list('tag');
  }
  @Post('tags')
  @ApiCreatedResponse({ type: CatalogItemDto })
  createTag(@Body() body: CreateNamedCatalogItemDto) {
    return this.service.create('tag', body.name);
  }
  @Patch('tags/:id')
  @ApiOkResponse({ type: CatalogItemDto })
  renameTag(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.service.rename('tag', id, body.name);
  }
  @Delete('tags/:id')
  @ApiOkResponse({ type: DeletedResponseDto })
  removeTag(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.remove('tag', id);
  }
}
