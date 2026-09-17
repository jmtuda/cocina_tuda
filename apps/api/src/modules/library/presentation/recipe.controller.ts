import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RecipeService } from '../application/recipe.service.js';
import { SaveRecipeDto } from './recipe.dto.js';
import { RecipeResponseDto } from './recipe-response.dto.js';

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipes: RecipeService) {}

  @Post()
  @ApiCreatedResponse({ type: RecipeResponseDto })
  create(@Body() body: SaveRecipeDto) {
    return this.recipes.create(body);
  }

  @Get(':id')
  @ApiOkResponse({ type: RecipeResponseDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.recipes.get(id);
  }

  @Put(':id')
  @ApiOkResponse({ type: RecipeResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: SaveRecipeDto,
  ) {
    return this.recipes.update(id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOkResponse({ type: RecipeResponseDto })
  archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.recipes.archive(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOkResponse({ type: RecipeResponseDto })
  restore(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.recipes.restore(id);
  }
}
