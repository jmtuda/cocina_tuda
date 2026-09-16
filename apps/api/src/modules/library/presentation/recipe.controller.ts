import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { RecipeService } from '../application/recipe.service.js';
import { ListRecipesDto, SaveRecipeDto } from './recipe.dto.js';

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipes: RecipeService) {}

  @Get()
  list(@Query() query: ListRecipesDto) {
    const statuses = (query.status?.split(',').filter(Boolean) ?? [
      'ACTIVE',
    ]) as Array<'ACTIVE' | 'ARCHIVED'>;
    if (
      query.pageSize > 100 ||
      statuses.some((status) => !['ACTIVE', 'ARCHIVED'].includes(status)) ||
      [
        ...(query.category?.split(',').filter(Boolean) ?? []),
        ...(query.tag?.split(',').filter(Boolean) ?? []),
        ...(query.ingredient?.split(',').filter(Boolean) ?? []),
        ...(query.variant?.split(',').filter(Boolean) ?? []),
      ].some((id) => !isUUID(id, '4'))
    ) {
      throw new BadRequestException('Filtros de listado no válidos');
    }
    return this.recipes.list({
      page: query.page,
      pageSize: query.pageSize,
      statuses,
      categoryIds: query.category?.split(',').filter(Boolean) ?? [],
      tagIds: query.tag?.split(',').filter(Boolean) ?? [],
      text: query.q?.trim() ?? '',
      ingredientIds: query.ingredient?.split(',').filter(Boolean) ?? [],
      variantIds: query.variant?.split(',').filter(Boolean) ?? [],
    });
  }

  @Post()
  create(@Body() body: SaveRecipeDto) {
    return this.recipes.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.recipes.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: SaveRecipeDto) {
    return this.recipes.update(id, body);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.recipes.archive(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.recipes.restore(id);
  }
}
