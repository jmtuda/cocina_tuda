import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../application/catalog.service.js';
import { CreateNamedCatalogItemDto, CreateUnitDto } from './catalog.dto.js';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('ingredients')
  listIngredients() {
    return this.catalog.listIngredients();
  }

  @Post('ingredients')
  createIngredient(@Body() body: CreateNamedCatalogItemDto) {
    return this.catalog.createIngredient(body.name);
  }

  @Post('ingredients/:ingredientId/variants')
  createVariant(
    @Param('ingredientId') ingredientId: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.catalog.createVariant(ingredientId, body.name);
  }

  @Get('units')
  listUnits() {
    return this.catalog.listUnits();
  }

  @Post('units')
  createUnit(@Body() body: CreateUnitDto) {
    return this.catalog.createUnit(body.name, body.abbreviation);
  }
}
