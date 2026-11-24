import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreatePurchaseDto, ReceivePurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(AuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get('options')
  @RequirePermissions('purchases.view')
  options(@Query('search') search?: string) { return this.service.options(search); }

  @Get()
  @RequirePermissions('purchases.view')
  list(@Query('page') page?: string, @Query('search') search?: string) { return this.service.list(page, search); }

  @Get(':id')
  @RequirePermissions('purchases.view')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('purchases.create')
  create(@Body() data: CreatePurchaseDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(data, req.user.id, req.ip);
  }

  @Post(':id/receive')
  @RequirePermissions('purchases.receive')
  receive(@Param('id', ParseUUIDPipe) id: string, @Body() data: ReceivePurchaseDto, @Req() req: AuthenticatedRequest) {
    return this.service.receive(id, data, req.user.id, req.ip);
  }
}
