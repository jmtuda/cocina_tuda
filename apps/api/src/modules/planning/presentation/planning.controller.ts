import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlanningService } from '../application/planning.service.js';
import {
  PlannedMealRangeDto,
  PlannedMealResponseDto,
  SavePlannedMealDto,
} from './planning.dto.js';

@ApiTags('planning')
@Controller('planned-meals')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get()
  @ApiOkResponse({ type: [PlannedMealResponseDto] })
  list(@Query() query: PlannedMealRangeDto) {
    return this.planning.list(query.from, query.to);
  }

  @Post()
  @ApiCreatedResponse({ type: PlannedMealResponseDto })
  create(@Body() body: SavePlannedMealDto) {
    return this.planning.create(body);
  }

  @Put(':id')
  @ApiOkResponse({ type: PlannedMealResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: SavePlannedMealDto,
  ) {
    return this.planning.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.planning.remove(id);
  }
}
