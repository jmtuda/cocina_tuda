import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../application/catalog.service.js';
import { CreateNamedCatalogItemDto, CreateUnitDto } from './catalog.dto.js';
import {
  CatalogItemDto,
  IngredientResponseDto,
  IngredientVariantResponseDto,
  UnitResponseDto,
} from './catalog-response.dto.js';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('ingredients')
  @ApiOkResponse({ type: [IngredientResponseDto] })
  listIngredients() {
    return this.catalog.listIngredients();
  }

  @Post('ingredients')
  @ApiCreatedResponse({ type: CatalogItemDto })
  createIngredient(@Body() body: CreateNamedCatalogItemDto) {
    return this.catalog.createIngredient(body.name);
  }

  @Post('ingredients/:ingredientId/variants')
  @ApiCreatedResponse({ type: IngredientVariantResponseDto })
  createVariant(
    @Param('ingredientId', new ParseUUIDPipe({ version: '4' }))
    ingredientId: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.catalog.createVariant(ingredientId, body.name);
  }

  @Get('units')
  @ApiOkResponse({ type: [UnitResponseDto] })
  listUnits() {
    return this.catalog.listUnits();
  }

  @Post('units')
  @ApiCreatedResponse({ type: UnitResponseDto })
  createUnit(@Body() body: CreateUnitDto) {
    return this.catalog.createUnit(body.name, body.abbreviation);
  }
}
