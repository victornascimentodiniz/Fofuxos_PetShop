import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockFractionationController } from './stock-fractionation.controller';
import { StockFractionationService } from './stock-fractionation.service';

@Module({
  imports: [AuthModule],
  controllers: [StockController, StockFractionationController],
  providers: [StockService, StockFractionationService],
  exports: [StockService, StockFractionationService],
})
export class StockModule {}
