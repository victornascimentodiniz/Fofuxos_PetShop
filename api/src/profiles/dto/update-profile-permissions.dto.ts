
import {
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
  IsString,
} from 'class-validator';

export class UpdateProfilePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  permissionCodes!: string[];
}
