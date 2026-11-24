import { ArrayMaxSize, IsArray, IsBoolean, IsHexColor, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const ICONS = ['package', 'bone', 'paw-print', 'heart', 'toy-brick', 'shapes', 'dog', 'cat', 'droplets', 'scissors', 'gift', 'tag', 'shopping-bag'] as const;

export class SaveAttendanceGroupDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsOptional() @IsIn(ICONS)
  icon?: typeof ICONS[number];

  @IsOptional() @IsHexColor()
  color?: string;

  @IsOptional() @IsInt() @Min(0) @Max(9999)
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;

  @IsArray() @ArrayMaxSize(500) @IsUUID('4', { each: true })
  productIds!: string[];
}
