import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListRecipesDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;
  @ApiPropertyOptional({ description: 'ACTIVE,ARCHIVED' })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiPropertyOptional({ description: 'UUIDs separated by comma' })
  @IsOptional()
  @IsString()
  category?: string;
  @ApiPropertyOptional({ description: 'UUIDs separated by comma' })
  @IsOptional()
  @IsString()
  tag?: string;
  @ApiPropertyOptional({ description: 'Text to search' })
  @IsOptional()
  @IsString()
  q?: string;
  @ApiPropertyOptional({
    description: 'Base ingredient UUIDs separated by comma',
  })
  @IsOptional()
  @IsString()
  ingredient?: string;
  @ApiPropertyOptional({
    description: 'Ingredient variant UUIDs separated by comma',
  })
  @IsOptional()
  @IsString()
  variant?: string;
}

export class NamedSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class RecipeSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] }) status!: string;
  @ApiProperty({ type: [NamedSummaryDto] }) categories!: NamedSummaryDto[];
  @ApiProperty({ type: [NamedSummaryDto] }) tags!: NamedSummaryDto[];
}

export class RecipeSearchResultDto {
  @ApiProperty({ type: [RecipeSummaryDto] }) items!: RecipeSummaryDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
