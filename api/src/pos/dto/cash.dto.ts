import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class TerminalDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/, { message: 'Código do terminal inválido (2 a 40 caracteres: letras, números, _ e -).' })
  terminalCode!: string;
}

export class OpenCashDto extends TerminalDto {
  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'Valor de abertura inválido; use até duas casas decimais.' })
  openingAmount!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class CashMovementDto extends TerminalDto {
  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'Valor inválido; use até duas casas decimais.' })
  amount!: string;

  @IsString() @MinLength(3) @MaxLength(180)
  reason!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class CloseCashDto extends TerminalDto {
  @Transform(({ value }) => typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : value)
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'Valor declarado inválido; use até duas casas decimais.' })
  closingDeclaredAmount!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
