import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { ProductConversionDto } from './dto/product-conversion.dto';

const PRODUCT_SELECT = {
  id: true, code: true, name: true, barcode: true,
  unit: true, saleType: true, active: true, controlStock: true, currentStock: true,
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} as const;
const CONVERSION_SELECT = {
  id: true, sourceProductId: true, destinationProductId: true,
  conversionFactor: true, description: true, active: true, createdAt: true, updatedAt: true,
  sourceProduct: { select: PRODUCT_SELECT },
  destinationProduct: { select: PRODUCT_SELECT },
} as const;
type ProductRecord = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;
type ConversionRecord = Prisma.ProductConversionGetPayload<{ select: typeof CONVERSION_SELECT }>;

@Injectable()
export class ProductConversionsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatProduct(product: ProductRecord) {
    return { ...product, formattedCode: String(product.code).padStart(6, '0'), currentStock: product.currentStock.toFixed(3) };
  }

  private eligibleSource(product: ProductRecord) {
    return product.active && product.controlStock && product.unit === 'UN' && product.saleType === 'UNIT';
  }

  private eligibleDestination(product: ProductRecord) {
    return product.active && product.controlStock && ((product.unit === 'UN' && product.saleType === 'UNIT') || (product.unit === 'KG' && product.saleType === 'WEIGHT'));
  }

  private formatConversion(conversion: ConversionRecord) {
    return {
      ...conversion,
      conversionFactor: conversion.conversionFactor.toFixed(3),
      sourceProduct: this.formatProduct(conversion.sourceProduct),
      destinationProduct: this.formatProduct(conversion.destinationProduct),
      conversionLabel: `1 ${conversion.sourceProduct.unit} = ${conversion.conversionFactor.toString()} ${conversion.destinationProduct.unit}`,
      available: conversion.active && this.eligibleSource(conversion.sourceProduct) && this.eligibleDestination(conversion.destinationProduct),
    };
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('Já existe uma conversão para este produto.');
      if (error.code === 'P2025') throw new NotFoundException('Produto ou conversão não encontrado.');
      if (error.code === 'P2003') throw new ConflictException('Produto vinculado indisponível.');
      if (error.code === 'P2034') throw new ConflictException('Configuração alterada simultaneamente. Tente novamente.');
    }
    throw error;
  }

  private async validate(tx: Prisma.TransactionClient, sourceId: string, destinationId: string, factor: Prisma.Decimal) {
    if (sourceId === destinationId) throw new BadRequestException('Origem e destino devem ser diferentes.');
    if (!factor.isFinite() || factor.lte(0) || factor.decimalPlaces() > 3 || factor.gte('100000000000')) {
      throw new BadRequestException('Fator de conversão inválido.');
    }
    const source = await tx.product.findUnique({ where: { id: sourceId }, select: PRODUCT_SELECT });
    const destination = await tx.product.findUnique({ where: { id: destinationId }, select: PRODUCT_SELECT });
    if (!source || !destination) throw new NotFoundException('Produto de origem ou destino não encontrado.');
    if (!this.eligibleSource(source)) throw new BadRequestException('A origem deve estar ativa, controlar estoque e ser vendida por unidade.');
    if (!this.eligibleDestination(destination)) throw new BadRequestException('O destino deve estar ativo, controlar estoque e ser vendido por unidade ou quilo.');
    if (destination.unit === 'UN' && !factor.isInteger()) throw new BadRequestException('O destino por unidade exige uma quantidade inteira.');
    // Verificar todas as regras, inclusive inativas, para impedir ciclos futuros.
    const visited = new Set<string>();
    let next: string | null = destinationId;
    while (next !== null) {
      if (next === sourceId || visited.has(next)) throw new BadRequestException('Conversão circular não permitida.');
      visited.add(next);
      const link: { destinationProductId: string } | null = await tx.productConversion.findUnique({ where: { sourceProductId: next }, select: { destinationProductId: true } });
      next = link?.destinationProductId ?? null;
    }
    return { source, destination };
  }

  private async ensureProduct(id: string) {
    if (!(await this.prisma.product.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Produto não encontrado.');
    }
  }

  async findAll(active?: boolean) {
    const rows = await this.prisma.productConversion.findMany({ where: active === undefined ? {} : { active }, select: CONVERSION_SELECT, orderBy: { sourceProduct: { name: 'asc' } } });
    return rows.map(row => this.formatConversion(row));
  }

  async findBySource(sourceProductId: string) {
    await this.ensureProduct(sourceProductId);
    const row = await this.prisma.productConversion.findUnique({ where: { sourceProductId }, select: CONVERSION_SELECT });
    return row ? this.formatConversion(row) : null;
  }

  async findByDestination(destinationProductId: string) {
    await this.ensureProduct(destinationProductId);
    const rows = await this.prisma.productConversion.findMany({ where: { destinationProductId }, select: CONVERSION_SELECT, orderBy: { sourceProduct: { name: 'asc' } } });
    return rows.map(row => this.formatConversion(row));
  }

  async findOptions(sourceProductId: string, search?: string) {
    const source = await this.prisma.product.findUnique({ where: { id: sourceProductId }, select: PRODUCT_SELECT });
    if (!source) throw new NotFoundException('Produto de origem não encontrado.');
    if (!this.eligibleSource(source)) throw new BadRequestException('Produto de origem inapto ao fracionamento.');
    const term = search?.trim();
    const where: Prisma.ProductWhereInput = {
      id: { not: sourceProductId }, active: true, controlStock: true,
      AND: [{ OR: [{ unit: 'UN', saleType: 'UNIT' }, { unit: 'KG', saleType: 'WEIGHT' }] }],
    };
    if (term) {
      if (term.length > 150) throw new BadRequestException('Pesquisa muito longa.');
      const filters: Prisma.ProductWhereInput[] = [{ name: { contains: term, mode: 'insensitive' } }, { barcode: { contains: term } }];
      const code = Number(term);
      if (/^\d+$/.test(term) && Number.isInteger(code) && code > 0 && code <= 2147483647) filters.push({ code });
      where.OR = filters;
    }
    const rows = await this.prisma.product.findMany({ where, select: PRODUCT_SELECT, orderBy: { name: 'asc' }, take: 100 });
    return rows.map(row => this.formatProduct(row));
  }

  async save(sourceProductId: string, dto: ProductConversionDto, userId: string, ipAddress?: string) {
    const factor = new Prisma.Decimal(dto.conversionFactor);
    try {
      return await this.prisma.$transaction(async tx => {
        const { source, destination } = await this.validate(tx, sourceProductId, dto.destinationProductId, factor);
        const existing = await tx.productConversion.findUnique({ where: { sourceProductId } });
        const description = dto.description?.trim() || null;
        const row = await tx.productConversion.upsert({
          where: { sourceProductId },
          create: { sourceProductId, destinationProductId: dto.destinationProductId, conversionFactor: factor, description, active: true },
          update: { destinationProductId: dto.destinationProductId, conversionFactor: factor, description },
          select: CONVERSION_SELECT,
        });
        await tx.auditLog.create({ data: {
          userId, action: existing ? 'PRODUCT_CONVERSION_UPDATED' : 'PRODUCT_CONVERSION_CREATED',
          description: `${existing ? `Regra anterior: ${existing.destinationProductId}, fator ${existing.conversionFactor.toString()}. ` : ''}Conversão: 1 ${source.name} gera ${factor.toString()} ${destination.unit} de ${destination.name}.`,
          entity: 'ProductConversion', entityId: row.id, ipAddress,
        } });
        return this.formatConversion(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { this.handleError(error); }
  }

  async updateStatus(sourceProductId: string, active: boolean, userId: string, ipAddress?: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const current = await tx.productConversion.findUnique({ where: { sourceProductId }, select: CONVERSION_SELECT });
        if (!current) throw new NotFoundException('Conversão não encontrada.');
        if (active) await this.validate(tx, sourceProductId, current.destinationProductId, current.conversionFactor);
        if (current.active === active) return this.formatConversion(current);
        const row = await tx.productConversion.update({ where: { sourceProductId }, data: { active }, select: CONVERSION_SELECT });
        await tx.auditLog.create({ data: {
          userId, action: active ? 'PRODUCT_CONVERSION_ACTIVATED' : 'PRODUCT_CONVERSION_DEACTIVATED',
          description: `Conversão de ${row.sourceProduct.name} ${active ? 'ativada' : 'desativada'}.`,
          entity: 'ProductConversion', entityId: row.id, ipAddress,
        } });
        return this.formatConversion(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { this.handleError(error); }
  }
}
