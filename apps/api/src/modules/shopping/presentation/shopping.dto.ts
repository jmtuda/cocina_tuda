import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const QUANTITY = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;

export class GenerateShoppingListDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(160) name!: string;
  @ApiProperty({ example: '2026-09-21' }) @Matches(DATE) from!: string;
  @ApiProperty({ example: '2026-09-27' }) @Matches(DATE) to!: string;
  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  excludedPlannedMealIds?: string[];
}

export class RenameShoppingListDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(160) name!: string;
}

export class SaveShoppingItemDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  ingredientId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  variantId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  manualName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2.5' })
  @IsOptional()
  @Matches(QUANTITY)
  quantity?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  unitId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string | null;

  @ApiProperty({ default: false }) @IsBoolean() optional!: boolean;
  @ApiProperty({ default: false }) @IsBoolean() purchased!: boolean;
}

export class ShoppingItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiPropertyOptional({ nullable: true }) manualName!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) quantity!:
    string | null;
  @ApiProperty() optional!: boolean;
  @ApiProperty() purchased!: boolean;
}

export class ShoppingListResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) sourceFrom!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceTo!: string | null;
  @ApiProperty({ type: [ShoppingItemResponseDto] })
  items!: ShoppingItemResponseDto[];
}
