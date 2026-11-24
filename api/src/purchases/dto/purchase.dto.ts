import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';

export class PurchaseLineDto {
  @IsUUID() productId!: string;
  @IsString() @Matches(/^\d{1,11}(\.\d{1,3})?$/) quantity!: string;
  @IsString() @Matches(/^\d{1,10}(\.\d{1,4})?$/) unitCost!: string;
}
export class CreatePurchaseDto {
  @IsUUID() supplierId!: string;
  @IsOptional() @IsString() @MaxLength(50) invoiceNumber?: string;
  @IsOptional() @IsString() @MaxLength(20) invoiceSeries?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PurchaseLineDto)
  items!: PurchaseLineDto[];
}
export class ReceiveLineDto {
  @IsUUID() purchaseItemId!: string;
  @IsString() @Matches(/^\d{1,11}(\.\d{1,3})?$/) quantity!: string;
}
export class ReceivePurchaseDto {
  @IsUUID() operationId!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ReceiveLineDto)
  items!: ReceiveLineDto[];
}
