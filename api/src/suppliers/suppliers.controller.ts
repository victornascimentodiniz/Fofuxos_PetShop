import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SupplierDto, SupplierStatusDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(AuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers.view')
  list(@Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.suppliers.list(search, status, page, limit);
  }

  @Get('options')
  @RequirePermissions('suppliers.view')
  options(@Query('search') search?: string) {
    return this.suppliers.options(search);
  }

  @Get(':id')
  @RequirePermissions('suppliers.view')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.get(id);
  }

  @Post()
  @RequirePermissions('suppliers.create')
  create(@Body() data: SupplierDto, @Req() req: AuthenticatedRequest) {
    return this.suppliers.create(data, req.user.id, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateSupplierDto, @Req() req: AuthenticatedRequest) {
    return this.suppliers.update(id, data, req.user.id, req.ip);
  }

  @Patch(':id/status')
  @RequirePermissions('suppliers.status')
  status(@Param('id', ParseUUIDPipe) id: string, @Body() data: SupplierStatusDto, @Req() req: AuthenticatedRequest) {
    return this.suppliers.status(id, data.active, req.user.id, req.ip);
  }
}
