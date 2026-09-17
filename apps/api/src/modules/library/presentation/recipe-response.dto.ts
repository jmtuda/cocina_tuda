import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NamedReferenceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class UnitReferenceDto extends NamedReferenceDto {
  @ApiProperty() abbreviation!: string;
}

export class RecipeStepResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiProperty() text!: string;
}

export class RecipeIngredientResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiProperty({ format: 'uuid' }) ingredientId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) variantId!:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) quantity!:
    string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) unitId!:
    string | null;
  @ApiProperty() optional!: boolean;
  @ApiPropertyOptional({ nullable: true }) observations!: string | null;
  @ApiProperty({ type: NamedReferenceDto }) ingredient!: NamedReferenceDto;
  @ApiPropertyOptional({ type: NamedReferenceDto, nullable: true })
  variant!: NamedReferenceDto | null;
  @ApiPropertyOptional({ type: UnitReferenceDto, nullable: true })
  unit!: UnitReferenceDto | null;
}

export class RecipeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) author!: string | null;
  @ApiPropertyOptional({ nullable: true }) servings!: number | null;
  @ApiPropertyOptional({ nullable: true }) difficulty!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] }) status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
  @ApiProperty({ type: [RecipeStepResponseDto] })
  steps!: RecipeStepResponseDto[];
  @ApiProperty({ type: [RecipeIngredientResponseDto] })
  ingredients!: RecipeIngredientResponseDto[];
  @ApiProperty({ type: [NamedReferenceDto] }) categories!: NamedReferenceDto[];
  @ApiProperty({ type: [NamedReferenceDto] }) tags!: NamedReferenceDto[];
}
