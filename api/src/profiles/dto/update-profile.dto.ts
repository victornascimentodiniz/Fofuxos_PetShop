
import {
  IsString,
  IsOptional,
  Length,
  MaxLength,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
