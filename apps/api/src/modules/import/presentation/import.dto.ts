import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBase64,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportSourceDto {
  @ApiProperty({ enum: ['text', 'file'] })
  @IsIn(['text', 'file'])
  kind!: 'text' | 'file';
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() filename?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBase64() dataBase64?: string;
}

export class CreateImportProposalDto {
  @ApiProperty() @IsBoolean() consent!: boolean;
  @ApiProperty({ type: ImportSourceDto })
  @ValidateNested()
  @Type(() => ImportSourceDto)
  source!: ImportSourceDto;
}

export class ConfirmedReferenceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  existingId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  createName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  createAbbreviation?: string;
}

export class ConfirmedIngredientDto {
  @ApiProperty({ type: ConfirmedReferenceDto })
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  ingredient!: ConfirmedReferenceDto;
  @ApiPropertyOptional({ type: ConfirmedReferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  variant?: ConfirmedReferenceDto;
  @ApiPropertyOptional() @IsOptional() @IsString() quantity?: string;
  @ApiPropertyOptional({ type: ConfirmedReferenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  unit?: ConfirmedReferenceDto;
  @ApiProperty() @IsBoolean() optional!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class ConfirmImportDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() author?:
    string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  difficulty?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() notes?:
    string | null;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  steps!: string[];
  @ApiProperty({ type: [ConfirmedIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmedIngredientDto)
  ingredients!: ConfirmedIngredientDto[];
  @ApiProperty({ type: [ConfirmedReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmedReferenceDto)
  categories!: ConfirmedReferenceDto[];
  @ApiProperty({ type: [ConfirmedReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmedReferenceDto)
  tags!: ConfirmedReferenceDto[];
}

export class ImportProposalResponseDto {
  @ApiProperty({ format: 'uuid' }) importId!: string;
  @ApiProperty({ type: Object }) proposal!: object;
}
