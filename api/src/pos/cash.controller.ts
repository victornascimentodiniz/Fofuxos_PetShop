import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CashService } from './cash.service';
import { CashMovementDto, CloseCashDto, OpenCashDto } from './dto/cash.dto';

@Controller('pos/cash')
@UseGuards(AuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Post('open')
  @RequirePermissions('pos.access', 'pos.open')
  open(@Body() dto: OpenCashDto, @Req() request: AuthenticatedRequest) {
    return this.cash.open(dto, request.user.id, request.ip);
  }

  @Get('current')
  @RequirePermissions('pos.access')
  current(@Query('terminalCode') terminalCode: string) {
    return this.cash.current(terminalCode);
  }

  @Post('withdrawal')
  @RequirePermissions('pos.access', 'pos.withdrawal')
  withdrawal(@Body() dto: CashMovementDto, @Req() request: AuthenticatedRequest) {
    return this.cash.movement('WITHDRAWAL', dto, request.user.id, request.ip);
  }

  @Post('supply')
  @RequirePermissions('pos.access', 'pos.supply')
  supply(@Body() dto: CashMovementDto, @Req() request: AuthenticatedRequest) {
    return this.cash.movement('SUPPLY', dto, request.user.id, request.ip);
  }

  @Post('close')
  @RequirePermissions('pos.access', 'pos.close')
  close(@Body() dto: CloseCashDto, @Req() request: AuthenticatedRequest) {
    return this.cash.close(dto, request.user.id, request.ip);
  }

  @Get('history')
  @RequirePermissions('pos.access', 'pos.close')
  history(@Query('terminalCode') terminalCode?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.cash.history(terminalCode, page, limit);
  }
}
