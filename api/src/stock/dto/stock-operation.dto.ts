import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class StockEntryDto {
  @IsUUID()
  productId!: string;

  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, { message: 'Quantidade inválida (até três casas decimais).' })
  quantity!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class StockExitDto extends StockEntryDto {}

export class StockAdjustmentDto {
  @IsUUID()
  productId!: string;

  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, { message: 'Saldo informado inválido (até três casas decimais).' })
  newStock!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}
