import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const QUANTITY = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;

export class ShoppingListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class ShoppingListSummaryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) sourceFrom!: string | null;
  @ApiProperty({ nullable: true, type: String }) sourceTo!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  generatedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export class ShoppingListPageResponseDto {
  @ApiProperty({ type: [ShoppingListSummaryResponseDto] })
  items!: ShoppingListSummaryResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

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
