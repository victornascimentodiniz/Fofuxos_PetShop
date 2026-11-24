import {
  IsString,
  Length,
  Matches,
  IsUUID,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 120)
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-z0-9._-]+$/)
  username!: string;

  @IsString()
  @Length(12, 128)
  password!: string;

  @IsUUID()
  profileId!: string;
}