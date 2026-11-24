import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength, Matches } from 'class-validator';

// Campos opcionais aceitam null para permitir limpar um valor já salvo.
export class SupplierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\d[.\/-]?){10,18}\d$/, { message: 'Documento deve conter CPF ou CNPJ válido (somente números ou pontuação).' })
  document?: string | null;

  @IsOptional() @IsString() @MaxLength(30)
  stateRegistration?: string | null;

  @IsOptional() @IsEmail() @MaxLength(150)
  email?: string | null;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string | null;

  @IsOptional() @IsString() @MaxLength(120)
  contactName?: string | null;

  @IsOptional() @IsString() @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP deve conter 8 dígitos.' })
  zipCode?: string | null;

  @IsOptional() @IsString() @MaxLength(150)
  street?: string | null;

  @IsOptional() @IsString() @MaxLength(20)
  addressNumber?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  complement?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  neighborhood?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string | null;

  @IsOptional() @IsString() @Length(2, 2) @Matches(/^[a-zA-Z]{2}$/)
  state?: string | null;

  @IsOptional() @IsString() @MaxLength(5000)
  observations?: string | null;
}

// Update exige ao menos um campo, validado no service.
export class UpdateSupplierDto extends SupplierDto {
  // 'name' é opcional no PATCH; sobreescrevemos a validação herdada.
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
  declare name: string;
}

export class SupplierStatusDto {
  @IsIn([true, false])
  active!: boolean;
}
