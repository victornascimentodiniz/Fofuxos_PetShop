
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
  Length,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

import { Transform } from 'class-transformer';

import {
  ProductUnit,
  ProductSaleType,
} from '../../generated/prisma/enums';

export class ProductDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(ProductSaleType)
  saleType?: ProductSaleType;

  // Até 10 dígitos inteiros e 4 decimais.

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,4})?$/, {
    message: 'Preço de custo inválido.',
  })
  costPrice?: string;

  // Até 12 dígitos inteiros e 2 decimais.

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message: 'Preço de venda inválido.',
  })
  salePrice?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  controlStock?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, {
    message: 'Estoque mínimo inválido.',
  })
  minStock?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, {
    message: 'Estoque máximo inválido.',
  })
  maxStock?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string | null;
}
