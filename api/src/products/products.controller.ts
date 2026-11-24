
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

import { ProductsService } from './products.service';

import { ProductDto } from './dto/product.dto';

import {
  ProductFilterDto,
} from './dto/product-filter.dto';

import {
  UpdateProductStatusDto,
} from './dto/update-product-status.dto';

import {
  AuthGuard,
} from '../auth/guards/auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  RequirePermissions,
} from '../auth/decorators/permissions.decorator';

import type {
  AuthenticatedRequest,
} from '../auth/auth.types';

@Controller('products')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  // LISTAR PRODUTOS

  @Get()
  @RequirePermissions('products.view')
  findAll(
    @Query() filters: ProductFilterDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.findAll(
      filters,
      request.user,
    );
  }

  // INDICADORES DO MODULO

  @Get('stats')
  @RequirePermissions('products.view')
  getStats() {
    return this.productsService.getStats();
  }

  // CATEGORIAS E MARCAS ATIVAS

  @Get('options')
  @RequirePermissions('products.view')
  findOptions() {
    return this.productsService.findOptions();
  }

  // PESQUISAR CODIGO DE BARRAS

  @Get('barcode/:barcode')
  @RequirePermissions('products.view')
  findByBarcode(
    @Param('barcode') barcode: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.findByBarcode(
      barcode,
      request.user,
    );
  }

  // CONSULTAR POR ID

  @Get(':id')
  @RequirePermissions('products.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.findOne(
      id,
      request.user,
    );
  }

  // CADASTRAR PRODUTO

  @Post()
  @RequirePermissions(
    'products.create',
    'products.view',
    'products.price',
  )
  create(
    @Body() dto: ProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.create(
      dto,
      request.user,
      request.ip,
    );
  }

  // EDITAR PRODUTO

  @Patch(':id')
  @RequirePermissions(
    'products.update',
    'products.view',
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.update(
      id,
      dto,
      request.user,
      request.ip,
    );
  }

  // ALTERAR SITUACAO

  @Patch(':id/status')
  @RequirePermissions(
    'products.status',
    'products.view',
  )
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.updateStatus(
      id,
      dto.active,
      request.user,
      request.ip,
    );
  }
}
