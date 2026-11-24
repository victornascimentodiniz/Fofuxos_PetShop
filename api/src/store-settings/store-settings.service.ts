import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { StoreSettingsDto } from './store-settings.controller';
@Injectable()
export class StoreSettingsService {
 constructor(private readonly db:PrismaService){}
 get(){return this.db.storeSettings.upsert({where:{id:'main'},create:{id:'main'},update:{}})}
 update(dto:StoreSettingsDto){
   const clean = {storeName:dto.storeName.trim(),...(dto.phone!==undefined?{phone:dto.phone?.trim()||null}:{}),...(dto.whatsapp!==undefined?{whatsapp:dto.whatsapp?.trim()||null}:{}),...(dto.address!==undefined?{address:dto.address?.trim()||null}:{}),...(dto.receiptNote!==undefined?{receiptNote:dto.receiptNote?.trim()||null}:{})};
   return this.db.storeSettings.upsert({where:{id:'main'},create:{id:'main',...clean},update:clean});
 }
}
