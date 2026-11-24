import { IsUUID, IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProductConversionDto {
  @IsUUID()
  destinationProductId!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, { message: 'Informe um fator válido com até três casas decimais.' })
  conversionFactor!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
