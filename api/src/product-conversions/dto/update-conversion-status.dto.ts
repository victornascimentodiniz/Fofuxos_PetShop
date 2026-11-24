import { IsBoolean } from 'class-validator';
export class UpdateConversionStatusDto {
  @IsBoolean()
  active!: boolean;
}
