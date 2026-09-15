import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNamedCatalogItemDto {
  @ApiProperty({ example: 'Tomate' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateUnitDto extends CreateNamedCatalogItemDto {
  @ApiProperty({ example: 'g' })
  @IsString()
  @IsNotEmpty()
  abbreviation!: string;
}
