
import { IsBoolean } from 'class-validator';

export class UpdateCatalogStatusDto {
  @IsBoolean()
  active!: boolean;
}
