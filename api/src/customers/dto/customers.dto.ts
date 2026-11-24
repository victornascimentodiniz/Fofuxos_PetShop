import { IsBoolean, IsDateString, IsEmail, IsIn, IsNumberString, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CustomerDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsOptional() @IsString() @Matches(/^\d{11}$|^\d{14}$/, { message: 'Documento deve conter 11 ou 14 dígitos.' }) document?: string | null;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(30) whatsapp?: string | null;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string | null;
  @IsOptional() @IsString() @MaxLength(9) zipCode?: string | null;
  @IsOptional() @IsString() @MaxLength(220) address?: string | null;
  @IsOptional() @IsString() @MaxLength(20) number?: string | null;
  @IsOptional() @IsString() @MaxLength(100) neighborhood?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(2) state?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class PetDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(2) @MaxLength(50) species!: string;
  @IsOptional() @IsString() @MaxLength(100) breed?: string | null;
  @IsOptional() @IsIn(['MALE','FEMALE','UNKNOWN']) sex?: string | null;
  @IsOptional() @IsDateString() birthDate?: string | null;
  @IsOptional() @IsNumberString() @Matches(/^\d{1,5}(?:\.\d{1,3})?$/) weightKg?: string | null;
  @IsOptional() @IsString() @MaxLength(120) coat?: string | null;
  @IsOptional() @IsBoolean() neutered?: boolean | null;
  @IsOptional() @IsString() @MaxLength(2000) allergies?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) careNotes?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
