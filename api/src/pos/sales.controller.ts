import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateSaleDto } from './dto/sale.dto';
import { SalesService } from './sales.service';

@Controller('pos/sales')
@UseGuards(AuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('products')
  @RequirePermissions('pos.access', 'pos.sell')
  products(@Query('search') search?: string) {
    return this.sales.products(search);
  }

  @Get()
  @RequirePermissions('pos.access', 'pos.sell')
  list(@Query('terminalCode') terminalCode?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.sales.list(terminalCode, page, limit);
  }

  @Get(':id')
  @RequirePermissions('pos.access', 'pos.sell')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.sales.get(id);
  }

  @Post()
  @RequirePermissions('pos.access', 'pos.sell')
  create(@Body() dto: CreateSaleDto, @Req() request: AuthenticatedRequest) {
    return this.sales.create(dto, request.user.id, request.user.permissions ?? [], request.ip);
  }
}
