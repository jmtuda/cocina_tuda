import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
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

  @Patch('ingredients/:id')
  @ApiOkResponse({ type: CatalogItemDto })
  updateIngredient(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.catalog.updateIngredient(id, body.name);
  }

  @Patch('ingredients/:ingredientId/variants/:id')
  @ApiOkResponse({ type: IngredientVariantResponseDto })
  updateVariant(
    @Param('ingredientId', new ParseUUIDPipe({ version: '4' }))
    ingredientId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateNamedCatalogItemDto,
  ) {
    return this.catalog.updateVariant(ingredientId, id, body.name);
  }

  @Patch('units/:id')
  @ApiOkResponse({ type: UnitResponseDto })
  updateUnit(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateUnitDto,
  ) {
    return this.catalog.updateUnit(id, body.name, body.abbreviation);
  }

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
