import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateNamedCatalogItemDto {
  @ApiProperty({ example: 'Tomate' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name!: string;
}

export class CreateUnitDto extends CreateNamedCatalogItemDto {
  @ApiProperty({ example: 'g' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  abbreviation!: string;
}
