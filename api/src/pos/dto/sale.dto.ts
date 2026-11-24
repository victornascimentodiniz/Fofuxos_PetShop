import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';
import { SalePaymentMethod } from '../../generated/prisma/enums';

function numericText(value: unknown): unknown {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim().replace(',', '.');
  return value;
}

export class SaleItemDto {
  @IsUUID()
  productId!: string;

  @Transform(({ value }) => numericText(value))
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, { message: 'Quantidade inválida (máximo de 3 casas decimais).' })
  quantity!: string;
}

export class SalePaymentDto {
  @IsEnum(SalePaymentMethod)
  method!: SalePaymentMethod;

  // Valor líquido utilizado no pagamento, já descontado eventual troco.
  @Transform(({ value }) => numericText(value))
  @IsString()
  @Matches(/^\d{1,14}(\.\d{1,2})?$/, { message: 'Valor do pagamento inválido.' })
  amount!: string;

  // Em dinheiro, recebido = amount + troco. Para outras formas, omita.
  @Transform(({ value }) => numericText(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,14}(\.\d{1,2})?$/, { message: 'Valor recebido inválido.' })
  receivedAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class CreateSaleDto {
  @IsUUID()
  clientRequestId!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/, { message: 'Terminal inválido.' })
  terminalCode!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments!: SalePaymentDto[];

  @Transform(({ value }) => numericText(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,14}(\.\d{1,2})?$/, { message: 'Desconto inválido.' })
  discountAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
