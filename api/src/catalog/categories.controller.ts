
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

@Controller('categories')
@UseGuards(AuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(
    private readonly catalogService: CatalogService,
  ) {}

  // LISTAR CATEGORIAS

  @Get()
  @RequirePermissions('categories.view')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.catalogService.findAll(
      'category',
      search,
      status,
    );
  }

  // CONSULTAR CATEGORIA POR ID

  @Get(':id')
  @RequirePermissions('categories.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.findOne(
      'category',
      id,
    );
  }

  // CADASTRAR CATEGORIA

  @Post()
  @RequirePermissions('categories.create')
  create(
    @Body() dto: CreateCatalogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.create(
      'category',
      dto,
      request.user.id,
      request.ip,
    );
  }

  // EDITAR CATEGORIA

  @Patch(':id')
  @RequirePermissions('categories.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.update(
      'category',
      id,
      dto,
      request.user.id,
      request.ip,
    );
  }

  // ATIVAR OU DESATIVAR CATEGORIA

  @Patch(':id/status')
  @RequirePermissions('categories.status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.catalogService.updateStatus(
      'category',
      id,
      dto.active,
      request.user.id,
      request.ip,
    );
  }
}
