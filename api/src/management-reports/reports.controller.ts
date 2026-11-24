import { Controller, Get, Header, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@Controller('management-reports')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  dashboard(@Query('start') start?: string, @Query('end') end?: string) {
    return this.reports.dashboard(start, end);
  }

  @Get('cash-sessions')
  @RequirePermissions('sales.view')
  sessions(@Query('start') start?: string, @Query('end') end?: string,
    @Query('terminal') terminal?: string, @Query('status') status?: string,
    @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reports.sessions(start, end, terminal, status, page, limit);
  }

  @Get('cash-sessions/:id')
  @RequirePermissions('sales.view')
  session(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.session(id);
  }

  @Get('sales')
  @RequirePermissions('sales.view')
  sales(@Query('start') start?: string, @Query('end') end?: string,
    @Query('terminal') terminal?: string, @Query('operatorId') operatorId?: string,
    @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reports.sales(start, end, terminal, operatorId, status, page, limit);
  }

  @Get('financial-summary')
  @RequirePermissions('sales.view')
  financialSummary(@Query('start') start?: string, @Query('end') end?: string,
    @Query('terminal') terminal?: string, @Query('operatorId') operatorId?: string) {
    return this.reports.financialSummary(start, end, terminal, operatorId);
  }

  @Get('export/sales.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="fofuxos-vendas.csv"')
  @RequirePermissions('sales.view')
  exportSales(@Query('start') start?: string, @Query('end') end?: string,
    @Query('terminal') terminal?: string, @Query('operatorId') operatorId?: string,
    @Query('status') status?: string) {
    return this.reports.exportSales(start, end, terminal, operatorId, status);
  }

  @Get('export/cash-sessions.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="fofuxos-caixas.csv"')
  @RequirePermissions('sales.view')
  exportCashSessions(@Query('start') start?: string, @Query('end') end?: string,
    @Query('terminal') terminal?: string, @Query('status') status?: string) {
    return this.reports.exportCashSessions(start, end, terminal, status);
  }

  @Get('sales/:id')
  @RequirePermissions('sales.view')
  sale(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.sale(id);
  }
}
