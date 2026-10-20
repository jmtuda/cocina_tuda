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
  Max,
  ValidateNested,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';

export class MamboConfigurationDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 2147483647,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  speed?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 2147483647,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  temperature?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 2147483647,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  ct?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 2147483647,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  durationSeconds?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  observations?: string | null;
}

export class RecipeStepDto {
  @ApiProperty({ example: 0 }) @IsInt() @Min(0) position!: number;
  @ApiProperty() @IsString() @IsNotEmpty() text!: string;
  @ApiPropertyOptional({ type: MamboConfigurationDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => MamboConfigurationDto)
  mambo?: MamboConfigurationDto | null;
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
  @ApiPropertyOptional({
    default: false,
    description:
      'Human review status; omitted on update preserves the current value',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  reviewed?: boolean;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  author?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  difficulty?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
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
