import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductConversionsController } from './product-conversions.controller';
import { ProductConversionsService } from './product-conversions.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductConversionsController],
  providers: [ProductConversionsService],
  exports: [ProductConversionsService],
})
export class ProductConversionsModule {}
