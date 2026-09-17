import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { SearchService } from '../application/search.service.js';
import { ListRecipesDto, RecipeSearchResultDto } from './search.dto.js';

@ApiTags('recipes')
@Controller('recipes')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOkResponse({ type: RecipeSearchResultDto })
  list(@Query() query: ListRecipesDto) {
    const statuses = query.status?.split(',').filter(Boolean) ?? ['ACTIVE'];
    const ids = [
      query.category,
      query.tag,
      query.ingredient,
      query.variant,
    ].flatMap((value) => value?.split(',').filter(Boolean) ?? []);
    if (
      query.pageSize > 100 ||
      statuses.length === 0 ||
      statuses.some((status) => !['ACTIVE', 'ARCHIVED'].includes(status)) ||
      ids.some((id) => !isUUID(id, '4'))
    ) {
      throw new BadRequestException('Filtros de listado no válidos');
    }
    return this.search.search({
      page: query.page,
      pageSize: query.pageSize,
      statuses: statuses as Array<'ACTIVE' | 'ARCHIVED'>,
      categoryIds: query.category?.split(',').filter(Boolean) ?? [],
      tagIds: query.tag?.split(',').filter(Boolean) ?? [],
      text: query.q?.trim() ?? '',
      ingredientIds: query.ingredient?.split(',').filter(Boolean) ?? [],
      variantIds: query.variant?.split(',').filter(Boolean) ?? [],
    });
  }
}
