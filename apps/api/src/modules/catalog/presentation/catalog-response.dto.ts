import { ApiProperty } from '@nestjs/swagger';

export class CatalogItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() normalizedName!: string;
}

export class IngredientVariantResponseDto extends CatalogItemDto {
  @ApiProperty({ format: 'uuid' }) ingredientId!: string;
}

export class IngredientResponseDto extends CatalogItemDto {
  @ApiProperty({ type: [IngredientVariantResponseDto] })
  variants!: IngredientVariantResponseDto[];
}

export class UnitResponseDto extends CatalogItemDto {
  @ApiProperty() abbreviation!: string;
}

export class DeletedResponseDto {
  @ApiProperty({ example: true }) deleted!: boolean;
}
