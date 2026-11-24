
import {
  IsString,
  IsOptional,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class UpdateCatalogDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
