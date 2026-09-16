import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
  ArrayUnique,
} from 'class-validator';

export class RecipeStepDto {
  @ApiProperty({ example: 0 }) @IsInt() @Min(0) position!: number;
  @ApiProperty() @IsString() @IsNotEmpty() text!: string;
}

export class RecipeIngredientDto {
  @ApiProperty({ example: 0 }) @IsInt() @Min(0) position!: number;
  @ApiProperty() @IsUUID() ingredientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() variantId?: string;
  @ApiPropertyOptional({ example: '125.5', type: String })
  @IsOptional()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/)
  quantity?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() unitId?: string;
  @ApiProperty({ default: false }) @IsBoolean() optional!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class SaveRecipeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() author?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) servings?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() difficulty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [RecipeStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps!: RecipeStepDto[];
  @ApiProperty({ type: [RecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  categoryIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  tagIds?: string[];
}

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
