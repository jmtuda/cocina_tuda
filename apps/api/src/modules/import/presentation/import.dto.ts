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
  ValidateBy,
} from 'class-validator';
import {
  isImportRecipeStep,
  type ImportRecipeStep,
} from '../domain/import-proposal.js';

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
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  discarded?: boolean;
}

export class ConfirmedIngredientDto {
  @ApiProperty({ type: ConfirmedReferenceDto })
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  ingredient!: ConfirmedReferenceDto;
  @ApiProperty({ type: ConfirmedReferenceDto })
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  variant!: ConfirmedReferenceDto;
  @ApiPropertyOptional() @IsOptional() @IsString() quantity?: string;
  @ApiProperty({ type: ConfirmedReferenceDto })
  @ValidateNested()
  @Type(() => ConfirmedReferenceDto)
  unit!: ConfirmedReferenceDto;
  @ApiProperty() @IsBoolean() optional!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class ConfirmImportDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') importId!: string;
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
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: {
            text: { type: 'string' },
            mambo: {
              type: 'object',
              nullable: true,
              additionalProperties: false,
              properties: {
                speed: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 2147483647,
                  nullable: true,
                },
                temperature: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 2147483647,
                  nullable: true,
                },
                ct: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 2147483647,
                  nullable: true,
                },
                durationSeconds: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 2147483647,
                  nullable: true,
                },
                observations: { type: 'string', nullable: true },
              },
            },
          },
        },
      ],
    },
  })
  @IsArray()
  @ValidateBy(
    {
      name: 'importRecipeStep',
      validator: {
        validate: isImportRecipeStep,
        defaultMessage: () =>
          'Cada paso debe ser texto o un objeto con text y configuración Mambo válida',
      },
    },
    { each: true },
  )
  steps!: ImportRecipeStep[];
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
