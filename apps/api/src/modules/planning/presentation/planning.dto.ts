import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SavePlannedMealDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  recipeId!: string;

  @ApiProperty({ example: '2026-09-21' })
  @Matches(CALENDAR_DATE)
  plannedDate!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Cena con invitados' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mealName?: string | null;
}

export class PlannedMealRangeDto {
  @ApiProperty({ example: '2026-09-21' })
  @Matches(CALENDAR_DATE)
  from!: string;

  @ApiProperty({ example: '2026-09-27' })
  @Matches(CALENDAR_DATE)
  to!: string;
}

class PlannedRecipeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] }) status!: string;
}

export class PlannedMealResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) recipeId!: string;
  @ApiProperty({ example: '2026-09-21' }) plannedDate!: string;
  @ApiPropertyOptional({ nullable: true }) mealName!: string | null;
  @ApiProperty({ type: PlannedRecipeDto }) recipe!: PlannedRecipeDto;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
