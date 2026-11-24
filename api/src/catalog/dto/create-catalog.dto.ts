
import {
  IsString,
  IsOptional,
  Length,
  MaxLength,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class CreateCatalogDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
