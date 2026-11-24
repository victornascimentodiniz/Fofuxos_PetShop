import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CashMovementType, CashSessionStatus, ProductSaleType, ProductUnit, SalePaymentMethod, StockMovementType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, SalePaymentDto } from './dto/sale.dto';

const D = Prisma.Decimal;
const ZERO = new D(0);
const MAX_QUANTITY = new D('99999999999.999');
const MAX_MONEY = new D('99999999999999.99');
const MAX_CASH_MOVEMENT = new D('999999999999.99');
const ROUND = D.ROUND_HALF_UP;

const SALE_SELECT = {
  id: true, number: true, clientRequestId: true, operationId: true,
  cashSessionId: true, operatorId: true, status: true, subtotal: true,
  discountAmount: true, totalAmount: true, notes: true, createdAt: true,
  cashSession: { select: { terminalCode: true } },
  operator: { select: { id: true, name: true } },
  items: { select: { id: true, productId: true, productName: true, unit: true, quantity: true, unitPrice: true, totalAmount: true } },
  payments: { select: { id: true, method: true, amount: true, receivedAmount: true, changeAmount: true, reference: true } },
} as const;

type SaleRecord = Prisma.SaleGetPayload<{ select: typeof SALE_SELECT }>;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  private money(value: string | undefined, label: string, allowZero = false): Prisma.Decimal {
    const str = value ?? '0';
    if (!/^\d{1,14}(\.\d{1,2})?$/.test(str)) throw new BadRequestException(`${label}: valor inválido.`);
    const amount = new D(str);
    if (!amount.isFinite() || amount.gt(MAX_MONEY) || amount.lt(0) || (!allowZero && amount.eq(0))) {
      throw new BadRequestException(`${label}: valor fora dos limites permitidos.`);
    }
    return amount;
  }

  private terminal(raw?: string) {
    const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) throw new BadRequestException('Terminal inválido. Exemplo: CAIXA-01.');
    return code;
  }

  private serialize(s: SaleRecord) {
    return {
      ...s,
      subtotal: s.subtotal.toFixed(2),
      discountAmount: s.discountAmount.toFixed(2),
      totalAmount: s.totalAmount.toFixed(2),
      items: s.items.map((i) => ({ ...i, quantity: i.quantity.toFixed(3), unitPrice: i.unitPrice.toFixed(2), totalAmount: i.totalAmount.toFixed(2) })),
      payments: s.payments.map((p) => ({ ...p, amount: p.amount.toFixed(2), receivedAmount: p.receivedAmount?.toFixed(2) ?? null, changeAmount: p.changeAmount.toFixed(2) })),
    };
  }

  private validatePayments(payments: SalePaymentDto[], expectedTotal: Prisma.Decimal) {
    const entries = payments.map((p) => {
      const amount = this.money(p.amount, 'Pagamento');
      let receivedAmount: Prisma.Decimal | null = null;
      let changeAmount = ZERO;
      if (p.method === SalePaymentMethod.CASH) {
        if (p.receivedAmount === undefined) throw new BadRequestException('Informe o valor recebido no pagamento em dinheiro.');
        receivedAmount = this.money(p.receivedAmount, 'Valor recebido');
        if (receivedAmount.lt(amount)) throw new BadRequestException('Dinheiro recebido menor que o valor utilizado no pagamento.');
        changeAmount = receivedAmount.minus(amount);
      } else if (p.receivedAmount !== undefined) {
        throw new BadRequestException('Valor recebido só pode ser informado para dinheiro.');
      }
      return { method: p.method, amount, receivedAmount, changeAmount, reference: p.reference?.trim() || null };
    });
    for (const p of entries) {
      if (p.method === SalePaymentMethod.CASH && p.amount.gt(MAX_CASH_MOVEMENT)) {
        throw new BadRequestException('Pagamento em dinheiro excede o limite permitido.');
      }
    }
    const total = entries.reduce((sum, p) => sum.plus(p.amount), ZERO);
    if (!total.eq(expectedTotal)) throw new BadRequestException(`Pagamentos somam R$ ${total.toFixed(2)}, mas a venda totaliza R$ ${expectedTotal.toFixed(2)}.`);
    return entries;
  }

  // Na repetição de uma requisição, só retorna a venda anterior se
  // operador, terminal, itens, descontos e pagamentos corresponderem.
  private sameRequest(sale: SaleRecord, dto: CreateSaleDto, operatorId: string, terminalCode: string): boolean {
    if (sale.operatorId !== operatorId || sale.cashSession.terminalCode !== terminalCode) return false;
    if (sale.items.length !== dto.items.length || sale.payments.length !== dto.payments.length) return false;
    if (sale.notes !== (dto.notes?.trim() || null)) return false;
    if (!sale.discountAmount.eq(dto.discountAmount ?? '0')) return false;
    const saleItems = new Map(sale.items.map((i) => [i.productId, i.quantity.toFixed(3)]));
    if (!dto.items.every((i) => saleItems.get(i.productId) === new D(i.quantity).toFixed(3))) return false;
    const normalize = (ps: { method: SalePaymentMethod; amount: string; receivedAmount?: string; reference?: string | null }[]) =>
      ps.map((p) => `${p.method}|${new D(p.amount).toFixed(2)}|${p.receivedAmount === undefined ? '' : new D(p.receivedAmount).toFixed(2)}|${p.reference?.trim() || ''}`).sort().join(';');
    return normalize(sale.payments.map((p) => ({ method: p.method, amount: p.amount.toFixed(2), receivedAmount: p.receivedAmount?.toFixed(2), reference: p.reference })))
      === normalize(dto.payments);
  }

  async products(search?: string) {
    const term = search?.trim().slice(0, 150) || '';
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term } },
        ...(/^\d+$/.test(term) && Number(term) <= 2147483647 ? [{ code: Number(term) }] : []),
      ] } : {}),
    };
    const list = await this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, take: 50, select: {
      id: true, code: true, barcode: true, name: true, unit: true, saleType: true,
      salePrice: true, controlStock: true, currentStock: true, active: true,
    } });
    return list.map((p) => ({ ...p, salePrice: p.salePrice.toFixed(2), currentStock: p.currentStock.toFixed(3) }));
  }

  async list(rawTerminal?: string, pageText?: string, limitText?: string) {
    const terminalCode = rawTerminal ? this.terminal(rawTerminal) : undefined;
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Paginação inválida.');
    const where: Prisma.SaleWhereInput = terminalCode ? { cashSession: { terminalCode } } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({ where, select: SALE_SELECT, orderBy: [{ createdAt: 'desc' }, { number: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.sale.count({ where }),
    ]);
    return { data: data.map((s) => this.serialize(s)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, select: SALE_SELECT });
    if (!sale) throw new NotFoundException('Venda não encontrada.');
    return this.serialize(sale);
  }

  async create(dto: CreateSaleDto, operatorId: string, permissions: string[], ipAddress?: string) {
    const terminalCode = this.terminal(dto.terminalCode);
    const discount = this.money(dto.discountAmount, 'Desconto', true);
    if (discount.gt(0) && !permissions.includes('pos.discount')) throw new ForbiddenException('Sem permissão para conceder desconto.');
    if (new Set(dto.items.map((i) => i.productId)).size !== dto.items.length) throw new BadRequestException('Não repita produtos na mesma venda; some as quantidades.');

    // Repete a mesma venda, em vez de duplicá-la, caso o PDV reenvie após timeout.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existing = await tx.sale.findUnique({ where: { clientRequestId: dto.clientRequestId }, select: SALE_SELECT });
          if (existing) {
            if (!this.sameRequest(existing, dto, operatorId, terminalCode)) throw new ConflictException('Identificador de requisição já foi usado para uma venda diferente.');
            return this.serialize(existing);
          }

          const session = await tx.cashSession.findFirst({ where: { terminalCode, status: CashSessionStatus.OPEN }, select: { id: true } });
          if (!session) throw new ConflictException(`O terminal ${terminalCode} não possui um caixa aberto.`);

          // Escreve no registro do caixa para serializar venda x fechamento.
          const lock = await tx.cashSession.updateMany({ where: { id: session.id, status: CashSessionStatus.OPEN }, data: { status: CashSessionStatus.OPEN } });
          if (lock.count !== 1) throw new ConflictException('Caixa fechado durante a venda.');

          const ids = dto.items.map((i) => i.productId);
          const products = await tx.product.findMany({ where: { id: { in: ids } }, select: {
            id: true, name: true, active: true, unit: true, saleType: true,
            salePrice: true, controlStock: true, currentStock: true, costPrice: true,
          } });
          const byId = new Map(products.map((p) => [p.id, p]));

          const items = dto.items.map((input) => {
            const p = byId.get(input.productId);
            if (!p || !p.active) throw new BadRequestException('Produto inexistente ou inativo.');
            const quantity = new D(input.quantity);
            if (!quantity.isFinite() || quantity.lte(0) || quantity.gt(MAX_QUANTITY) || quantity.decimalPlaces() > 3) throw new BadRequestException(`Quantidade inválida para ${p.name}.`);
            if ((p.unit === ProductUnit.UN || p.saleType === ProductSaleType.UNIT) && !quantity.isInteger()) throw new BadRequestException(`O produto ${p.name} exige quantidade inteira.`);
            if (p.salePrice.lte(0)) throw new BadRequestException(`O produto ${p.name} está sem preço de venda positivo.`);
            const totalAmount = p.salePrice.times(quantity).toDecimalPlaces(2, ROUND);
            if (totalAmount.lte(0) || totalAmount.gt(MAX_MONEY)) throw new BadRequestException('Valor do item fora dos limites permitidos.');
            return { product: p, quantity, totalAmount };
          });

          const subtotal = items.reduce((sum, item) => sum.plus(item.totalAmount), ZERO);
          const total = subtotal.minus(discount);
          if (subtotal.gt(MAX_MONEY) || total.lte(0)) throw new BadRequestException('O total da venda deve ser positivo e o desconto não pode superar os itens.');
          const payments = this.validatePayments(dto.payments, total);

          // Validação de estoque e movimentações ocorrem no mesmo commit da venda.
          const operationId = randomUUID();
          const sale = await tx.sale.create({ data: {
            clientRequestId: dto.clientRequestId, operationId,
            cashSessionId: session.id, operatorId, subtotal,
            discountAmount: discount, totalAmount: total,
            notes: dto.notes?.trim() || null,
            items: { create: items.map(({ product: p, quantity, totalAmount }) => ({
              productId: p.id, productName: p.name, unit: p.unit, quantity,
              unitPrice: p.salePrice, totalAmount,
            })) },
            payments: { create: payments },
          }, select: { id: true, number: true } });

          for (const { product: p, quantity } of items) {
            if (!p.controlStock) continue;
            const after = p.currentStock.minus(quantity);
            if (after.lt(0)) throw new BadRequestException(`Estoque insuficiente para ${p.name}: disponível ${p.currentStock.toFixed(3)} ${p.unit}.`);
            const changed = await tx.product.updateMany({ where: { id: p.id, active: true, controlStock: true, currentStock: { gte: quantity } }, data: { currentStock: { decrement: quantity } } });
            if (changed.count !== 1) throw new ConflictException(`Estoque de ${p.name} alterado por outra operação. Tente novamente.`);
            await tx.stockMovement.create({ data: {
              productId: p.id, userId: operatorId, type: StockMovementType.SALE,
              quantity: quantity.neg(), previousStock: p.currentStock, newStock: after,
              unitCost: p.costPrice, operationId,
              reason: `Venda #${sale.number}`,
            } });
          }

          const cashPayments = payments.filter((p) => p.method === SalePaymentMethod.CASH);
          for (const p of cashPayments) {
            await tx.cashMovement.create({ data: {
              cashSessionId: session.id, userId: operatorId,
              type: CashMovementType.CASH_SALE, amount: p.amount,
              reason: `Venda #${sale.number}`, saleId: sale.id,
            } });
          }

          await tx.auditLog.create({ data: {
            userId: operatorId, action: 'POS_SALE_COMPLETED',
            entity: 'Sale', entityId: sale.id, ipAddress,
            description: `Venda #${sale.number} no ${terminalCode}: R$ ${total.toFixed(2)}; ${items.length} produto(s).`,
          } });
          const saved = await tx.sale.findUniqueOrThrow({ where: { id: sale.id }, select: SALE_SELECT });
          return this.serialize(saved);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2002') {
            const existing = await this.prisma.sale.findUnique({ where: { clientRequestId: dto.clientRequestId }, select: SALE_SELECT });
            if (existing && this.sameRequest(existing, dto, operatorId, terminalCode)) return this.serialize(existing);
            throw new ConflictException('Conflito na identificação da venda.');
          }
          if (error.code === 'P2034') throw new ConflictException('Operação simultânea detectada. Tente novamente.');
        }
        throw error;
      }
    }
    throw new ConflictException('Não foi possível concluir a venda.');
  }
}
