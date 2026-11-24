import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [AuthModule],
  controllers: [CashController, SalesController],
  providers: [CashService, SalesService],
  exports: [CashService, SalesService],
})
export class PosModule {}
