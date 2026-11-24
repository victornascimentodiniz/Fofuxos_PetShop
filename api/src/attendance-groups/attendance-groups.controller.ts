import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AttendanceGroupsService } from './attendance-groups.service';
import { SaveAttendanceGroupDto } from './dto/attendance-group.dto';

@Controller('attendance-groups')
@UseGuards(AuthGuard, PermissionsGuard)
export class AttendanceGroupsController {
  constructor(private readonly groups: AttendanceGroupsService) {}

  @Get()
  @RequirePermissions('products.view')
  list() { return this.groups.list(); }

  @Get('catalog-products')
  @RequirePermissions('products.view')
  catalog(@Query('search') search?: string) { return this.groups.catalogProducts(search); }

  @Post()
  @RequirePermissions('products.create')
  create(@Body() dto: SaveAttendanceGroupDto) { return this.groups.create(dto); }

  @Patch(':id')
  @RequirePermissions('products.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveAttendanceGroupDto) { return this.groups.update(id, dto); }
}

@Controller('pos/attendance-groups')
@UseGuards(AuthGuard, PermissionsGuard)
export class PosAttendanceGroupsController {
  constructor(private readonly groups: AttendanceGroupsService) {}

  @Get()
  @RequirePermissions('pos.access', 'pos.sell')
  list() { return this.groups.list(true); }
}
