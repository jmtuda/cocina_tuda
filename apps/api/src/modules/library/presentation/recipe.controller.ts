import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecipeService } from '../application/recipe.service.js';
import { SaveRecipeDto } from './recipe.dto.js';

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipes: RecipeService) {}

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
}
