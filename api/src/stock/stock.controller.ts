import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { StockAdjustmentDto, StockEntryDto, StockExitDto } from './dto/stock-operation.dto';
import { StockService } from './stock.service';

@Controller('stock')
@UseGuards(AuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  @RequirePermissions('stock.view')
  list(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.stock.list(search, page, limit);
  }

  @Get('stats')
  @RequirePermissions('stock.view')
  stats() {
    return this.stock.stats();
  }

  @Get('movements')
  @RequirePermissions('stock.history')
  movements(@Query('productId') productId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.stock.movements(productId, page, limit);
  }

  @Get('product/:id')
  @RequirePermissions('stock.view')
  product(@Param('id', ParseUUIDPipe) id: string) {
    return this.stock.product(id);
  }

  @Post('entry')
  @RequirePermissions('stock.entry')
  entry(@Body() data: StockEntryDto, @Req() request: AuthenticatedRequest) {
    return this.stock.change('ENTRY', data.productId, data.quantity, data.reason, data.observations, request.user.id, request.ip);
  }

  @Post('exit')
  @RequirePermissions('stock.exit')
  exit(@Body() data: StockExitDto, @Req() request: AuthenticatedRequest) {
    return this.stock.change('EXIT', data.productId, data.quantity, data.reason, data.observations, request.user.id, request.ip);
  }

  @Post('adjust')
  @RequirePermissions('stock.adjust')
  adjust(@Body() data: StockAdjustmentDto, @Req() request: AuthenticatedRequest) {
    return this.stock.change('ADJUSTMENT', data.productId, data.newStock, data.reason, data.observations, request.user.id, request.ip);
  }
}
