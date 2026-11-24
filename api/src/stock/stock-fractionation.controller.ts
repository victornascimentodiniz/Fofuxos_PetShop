import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { StockFractionationDto } from './dto/stock-fractionation.dto';
import { StockFractionationService } from './stock-fractionation.service';

@Controller('stock')
@UseGuards(AuthGuard, PermissionsGuard)
export class StockFractionationController {
  constructor(private readonly fractionation: StockFractionationService) {}

  @Post('fractionate')
  @RequirePermissions('stock.fraction')
  fractionate(@Body() dto: StockFractionationDto, @Req() request: AuthenticatedRequest) {
    return this.fractionation.fractionate(dto, request.user.id, request.ip);
  }

  @Get('fractionations')
  @RequirePermissions('stock.history')
  history(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fractionation.history(page, limit);
  }
}
