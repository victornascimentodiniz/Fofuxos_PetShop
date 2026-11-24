
import {
  IsString,
  IsOptional,
  Length,
  MaxLength,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class CreateProfileDto {
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

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  permissionCodes!: string[];
}
