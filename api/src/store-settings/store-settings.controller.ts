import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { StoreSettingsService } from './store-settings.service';
export class StoreSettingsDto {
 @IsString() @MinLength(2) @MaxLength(150) storeName!:string;
 @IsOptional() @IsString() @MaxLength(30) phone?:string|null;
 @IsOptional() @IsString() @MaxLength(30) whatsapp?:string|null;
 @IsOptional() @IsString() @MaxLength(255) address?:string|null;
 @IsOptional() @IsString() @MaxLength(400) receiptNote?:string|null;
}
@Controller('store-settings')
@UseGuards(AuthGuard,PermissionsGuard)
export class StoreSettingsController {
 constructor(private readonly service:StoreSettingsService){}
 @Get() @RequirePermissions('settings.view') get(){return this.service.get()}
 @Patch() @RequirePermissions('settings.update') update(@Body() dto:StoreSettingsDto){return this.service.update(dto)}
}
