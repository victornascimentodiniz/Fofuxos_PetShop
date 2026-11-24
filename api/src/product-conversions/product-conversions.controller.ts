import { Controller, Get, Put, Patch, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ProductConversionsService } from './product-conversions.service';
import { ProductConversionDto } from './dto/product-conversion.dto';
import { UpdateConversionStatusDto } from './dto/update-conversion-status.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('product-conversions')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductConversionsController {
  constructor(private readonly service: ProductConversionsService) {}

  @Get()
  @RequirePermissions('products.view')
  findAll(@Query('status') status?: string) {
    if (status !== undefined && !['all', 'active', 'inactive'].includes(status)) {
      throw new BadRequestException('Filtro de situação inválido.');
    }
    return this.service.findAll(status === 'active' ? true : status === 'inactive' ? false : undefined);
  }

  @Get('options/:sourceProductId')
  @RequirePermissions('products.view', 'products.conversion')
  findOptions(@Param('sourceProductId', ParseUUIDPipe) id: string, @Query('search') search?: string) {
    return this.service.findOptions(id, search);
  }

  @Get('source/:sourceProductId')
  @RequirePermissions('products.view')
  findBySource(@Param('sourceProductId', ParseUUIDPipe) id: string) {
    return this.service.findBySource(id);
  }

  @Get('destination/:destinationProductId')
  @RequirePermissions('products.view')
  findByDestination(@Param('destinationProductId', ParseUUIDPipe) id: string) {
    return this.service.findByDestination(id);
  }

  @Put('source/:sourceProductId')
  @RequirePermissions('products.view', 'products.update', 'products.conversion')
  save(@Param('sourceProductId', ParseUUIDPipe) id: string, @Body() dto: ProductConversionDto, @Req() request: AuthenticatedRequest) {
    return this.service.save(id, dto, request.user.id, request.ip);
  }

  @Patch('source/:sourceProductId/status')
  @RequirePermissions('products.view', 'products.update', 'products.conversion')
  updateStatus(@Param('sourceProductId', ParseUUIDPipe) id: string, @Body() dto: UpdateConversionStatusDto, @Req() request: AuthenticatedRequest) {
    return this.service.updateStatus(id, dto.active, request.user.id, request.ip);
  }
}
