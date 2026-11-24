
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { CatalogService } from './catalog.service';

import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { UpdateCatalogStatusDto } from './dto/update-catalog-status.dto';

import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('brands')
@UseGuards(AuthGuard, PermissionsGuard)
export class BrandsController {
  constructor(
    private readonly catalogService: CatalogService,
  ) {}

  // LISTAR MARCAS

  @Get()
  @RequirePermissions('brands.view')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.catalogService.findAll(
      'brand',
      search,
      status,
    );
  }

  // CONSULTAR MARCA POR ID

  @Get(':id')
  @RequirePermissions('brands.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.findOne(
      'brand',
      id,
    );
  }

  // CADASTRAR MARCA

  @Post()
  @RequirePermissions('brands.create')
  create(
    @Body() dto: CreateCatalogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.create(
      'brand',
      dto,
      request.user.id,
      request.ip,
    );
  }

  // EDITAR MARCA

  @Patch(':id')
  @RequirePermissions('brands.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.update(
      'brand',
      id,
      dto,
      request.user.id,
      request.ip,
    );
  }

  // ATIVAR OU DESATIVAR MARCA

  @Patch(':id/status')
  @RequirePermissions('brands.status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.updateStatus(
      'brand',
      id,
      dto.active,
      request.user.id,
      request.ip,
    );
  }
}
