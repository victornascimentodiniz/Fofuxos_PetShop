
import {
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsIn,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  ProductSaleType,
} from '../../generated/prisma/enums';

export class ProductFilterDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsEnum(ProductSaleType)
  saleType?: ProductSaleType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
