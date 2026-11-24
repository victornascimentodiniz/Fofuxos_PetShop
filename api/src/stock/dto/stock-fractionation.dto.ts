import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class StockFractionationDto {
  @IsUUID()
  sourceProductId!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  packages!: number;

  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, { message: 'Perda inválida (até três casas decimais).' })
  @IsOptional()
  lossQuantity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}
