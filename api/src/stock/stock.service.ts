import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_BALANCE = new Prisma.Decimal('99999999999.999');
const PRODUCTS_SELECT = {
  id: true,
  code: true,
  name: true,
  barcode: true,
  unit: true,
  saleType: true,
  active: true,
  controlStock: true,
  currentStock: true,
  minStock: true,
  maxStock: true,
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} as const;

type StockProduct = Prisma.ProductGetPayload<{ select: typeof PRODUCTS_SELECT }>;
type OperationType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeProduct(p: StockProduct) {
    return {
      ...p,
      formattedCode: String(p.code).padStart(6, '0'),
      currentStock: p.currentStock.toFixed(3),
      minStock: p.minStock.toFixed(3),
      maxStock: p.maxStock?.toFixed(3) ?? null,
      lowStock: p.controlStock && p.currentStock.lte(p.minStock),
    };
  }

  private pagination(pageText?: string, limitText?: string) {
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Paginação inválida. Página >= 1 e limite de 1 a 100.');
    }
    return { page, limit, skip: (page - 1) * limit };
  }

  async list(search?: string, pageText?: string, limitText?: string) {
    const pg = this.pagination(pageText, limitText);
    const where: Prisma.ProductWhereInput = {
      controlStock: true,
      ...(search?.trim() ? { name: { contains: search.trim().slice(0, 150), mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, select: PRODUCTS_SELECT, orderBy: { name: 'asc' }, skip: pg.skip, take: pg.limit }),
      this.prisma.product.count({ where }),
    ]);
    return { data: data.map((p) => this.serializeProduct(p)), pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) } };
  }

  async product(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: PRODUCTS_SELECT });
    if (!p) throw new NotFoundException('Produto não encontrado.');
    return this.serializeProduct(p);
  }

  async stats() {
    const [controlled, active, withoutStock, lowStock, movements] = await Promise.all([
      this.prisma.product.count({ where: { controlStock: true } }),
      this.prisma.product.count({ where: { controlStock: true, active: true } }),
      this.prisma.product.count({ where: { controlStock: true, currentStock: { lte: 0 } } }),
      this.prisma.product.findMany({ where: { controlStock: true }, select: { currentStock: true, minStock: true } }),
      this.prisma.stockMovement.count(),
    ]);
    return { controlled, active, withoutStock, lowStock: lowStock.filter((p) => p.currentStock.lte(p.minStock)).length, movements };
  }

  async movements(productId?: string, pageText?: string, limitText?: string) {
    if (productId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      throw new BadRequestException('ID de produto inválido.');
    }
    const pg = this.pagination(pageText, limitText);
    const where: Prisma.StockMovementWhereInput = productId ? { productId } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: pg.skip, take: pg.limit,
        select: { id: true, productId: true, userId: true, type: true, quantity: true, previousStock: true, newStock: true, reason: true, observations: true, operationId: true, createdAt: true,
          product: { select: { code: true, name: true, unit: true } }, user: { select: { name: true } } },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      data: data.map((m) => ({ ...m, quantity: m.quantity.toFixed(3), previousStock: m.previousStock.toFixed(3), newStock: m.newStock.toFixed(3) })),
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) },
    };
  }

  async change(type: OperationType, productId: string, valueText: string, reason: string, observations: string | undefined, userId: string, ipAddress?: string) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason || normalizedReason.length < 3 || normalizedReason.length > 150) {
      throw new BadRequestException('Informe um motivo entre 3 e 150 caracteres.');
    }
    const value = new Prisma.Decimal(valueText);
    if (!value.isFinite() || value.isNegative() || value.decimalPlaces() > 3 || value.gt(MAX_BALANCE) || (type !== 'ADJUSTMENT' && value.isZero())) {
      throw new BadRequestException('Quantidade inválida.');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const p = await tx.product.findUnique({ where: { id: productId }, select: PRODUCTS_SELECT });
          if (!p) throw new NotFoundException('Produto não encontrado.');
          if (!p.active) throw new BadRequestException('O produto está inativo.');
          if (!p.controlStock) throw new BadRequestException('O produto não controla estoque.');
          if (p.unit === 'UN' && !value.isInteger()) throw new BadRequestException('Este produto exige quantidades inteiras.');

          const previous = p.currentStock;
          const next = type === 'ENTRY' ? previous.plus(value) : type === 'EXIT' ? previous.minus(value) : value;
          if (next.isNegative()) throw new BadRequestException('Saldo insuficiente: esta operação deixaria o estoque negativo.');
          if (next.gt(MAX_BALANCE)) throw new BadRequestException('O saldo excede a capacidade do campo de estoque.');
          if (next.eq(previous)) throw new BadRequestException('O novo saldo precisa ser diferente do anterior.');
          // Verificação condicional evita atualização com leitura obsoleta.
          const result = await tx.product.updateMany({
            where: { id: productId, currentStock: previous, active: true, controlStock: true },
            data: { currentStock: next },
          });
          if (result.count !== 1) throw new ConflictException('Saldo alterado por outra operação. Tente novamente.');

          const delta = next.minus(previous);
          const movement = await tx.stockMovement.create({ data: {
            productId, userId, type, quantity: delta, previousStock: previous, newStock: next,
            reason: normalizedReason, observations: observations?.trim() || null,
          } });
          await tx.auditLog.create({ data: {
            userId, action: `STOCK_${type}`, entity: 'StockMovement', entityId: movement.id,
            description: `Estoque de "${p.name}": ${previous.toFixed(3)} -> ${next.toFixed(3)} ${p.unit}. Motivo: ${normalizedReason}.`, ipAddress,
          } });
          return { id: movement.id, type, productId, previousStock: previous.toFixed(3), quantity: delta.toFixed(3), newStock: next.toFixed(3), createdAt: movement.createdAt };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034' && attempt < 2) continue;
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') throw new ConflictException('Concorrência detectada. Tente novamente.');
        throw e;
      }
    }
    throw new ConflictException('Não foi possível concluir a operação.');
  }
}
