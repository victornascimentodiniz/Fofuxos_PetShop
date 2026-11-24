
import { IsBoolean } from 'class-validator';

export class UpdateProfileStatusDto {
  @IsBoolean()
  active!: boolean;
}
