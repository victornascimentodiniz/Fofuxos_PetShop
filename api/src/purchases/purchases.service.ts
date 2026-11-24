import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, ReceivePurchaseDto } from './dto/purchase.dto';

const MAX_QTY = new Prisma.Decimal('99999999999.999');
const money = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const purchaseInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true, code: true, unit: true } } } },
  receipts: { orderBy: { createdAt: 'desc' as const }, include: {
    receivedBy: { select: { id: true, name: true } },
    items: { include: { product: { select: { id: true, name: true, unit: true } } } },
  } },
} satisfies Prisma.PurchaseInclude;

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private qty(raw: string, label: string): Prisma.Decimal {
    let result: Prisma.Decimal;
    try { result = new Prisma.Decimal(raw); } catch { throw new BadRequestException(`${label} inválida.`); }
    if (!result.isFinite() || result.lte(0) || result.gt(MAX_QTY) || result.decimalPlaces() > 3) {
      throw new BadRequestException(`${label} inválida.`);
    }
    return result;
  }
  private cost(raw: string): Prisma.Decimal {
    let result: Prisma.Decimal;
    try { result = new Prisma.Decimal(raw); } catch { throw new BadRequestException('Custo inválido.'); }
    if (!result.isFinite() || result.lt(0) || result.gte('10000000000') || result.decimalPlaces() > 4) {
      throw new BadRequestException('Custo inválido.');
    }
    return result;
  }
  private async retry<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await task(); }
      catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
          if (attempt < 2) continue;
          throw new ConflictException('Alteração concorrente. Atualize a compra e tente novamente.');
        }
        throw e;
      }
    }
    throw new ConflictException('Não foi possível concluir a operação.');
  }
  async options(search?: string) {
    const term = search?.trim().slice(0, 100);
    const searchWhere: Prisma.ProductWhereInput = term ? { OR: [
      { name: { contains: term, mode: 'insensitive' } },
      ...( /^\d+$/.test(term) && Number.isSafeInteger(Number(term)) && Number(term) <= 2147483647 ? [{ code: Number(term) }] : [] ),
      { barcode: { contains: term, mode: 'insensitive' } },
    ] } : {};
    const [suppliers, products] = await Promise.all([
      this.prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 300 }),
      this.prisma.product.findMany({
        where: { active: true, ...searchWhere },
        select: { id: true, name: true, code: true, barcode: true, unit: true, controlStock: true, currentStock: true, costPrice: true },
        orderBy: { name: 'asc' }, take: 80,
      }),
    ]);
    return { suppliers, products };
  }
  async list(pageRaw?: string, search?: string) {
    const page = pageRaw === undefined ? 1 : Number(pageRaw);
    if (!Number.isSafeInteger(page) || page < 1) throw new BadRequestException('Página inválida.');
    const term = search?.trim().slice(0, 100);
    const where: Prisma.PurchaseWhereInput = term ? { OR: [
      { supplier: { name: { contains: term, mode: 'insensitive' } } },
      { invoiceNumber: { contains: term, mode: 'insensitive' } },
      ...(/^\d+$/.test(term) && Number.isSafeInteger(Number(term)) && Number(term) <= 2147483647 ? [{ number: Number(term) }] : []),
    ] } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20,
        include: { supplier: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true, receipts: true } } } }),
      this.prisma.purchase.count({ where }),
    ]);
    return { data, pagination: { page, total, totalPages: Math.ceil(total / 20) } };
  }
  async get(id: string) {
    const record = await this.prisma.purchase.findUnique({ where: { id }, include: purchaseInclude });
    if (!record) throw new NotFoundException('Compra não encontrada.');
    return record;
  }
  async create(dto: CreatePurchaseDto, userId: string, ipAddress?: string) {
    if (!dto.items?.length || dto.items.length > 100) throw new BadRequestException('Informe de 1 a 100 produtos.');
    if (new Set(dto.items.map(x => x.productId)).size !== dto.items.length) throw new BadRequestException('Não repita um produto na mesma compra.');
    const lines = dto.items.map(x => ({ productId: x.productId, quantity: this.qty(x.quantity, 'Quantidade'), unitCost: this.cost(x.unitCost) }));
    const totalAmount = money(lines.reduce((sum, x) => sum.plus(x.quantity.times(x.unitCost)), new Prisma.Decimal(0)));
    if (totalAmount.gte('1000000000000')) throw new BadRequestException('Valor total excede o limite permitido.');
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, active: true }, select: { id: true } });
    if (!supplier) throw new BadRequestException('Fornecedor não encontrado ou inativo.');
    const products = await this.prisma.product.findMany({ where: { id: { in: lines.map(x => x.productId) }, active: true }, select: { id: true, unit: true, controlStock: true } });
    if (products.length !== lines.length) throw new BadRequestException('Há produtos inexistentes ou inativos.');
    for (const line of lines) {
      const product = products.find(x => x.id === line.productId)!;
      if (!product.controlStock) throw new BadRequestException('A compra só recebe produtos com controle de estoque.');
      if (product.unit === 'UN' && !line.quantity.isInteger()) throw new BadRequestException('Produto UN exige quantidade inteira.');
    }
    const result = await this.prisma.$transaction(async tx => {
      const created = await tx.purchase.create({ data: {
      supplierId: dto.supplierId, createdById: userId, status: 'ORDERED',
      invoiceNumber: dto.invoiceNumber?.trim() || null, invoiceSeries: dto.invoiceSeries?.trim() || null,
      notes: dto.notes?.trim() || null, totalAmount,
      items: { create: lines.map(x => ({ productId: x.productId, quantity: x.quantity, unitCost: x.unitCost, totalCost: money(x.quantity.times(x.unitCost)) })) },
      }, select: { id: true, number: true } });
      await tx.auditLog.create({ data: { userId, action: 'PURCHASE_CREATE', entity: 'Purchase', entityId: created.id, description: `Compra #${created.number} cadastrada, aguardando recebimento.`, ipAddress } });
      return created;
    });
    return this.get(result.id);
  }
  async receive(purchaseId: string, dto: ReceivePurchaseDto, userId: string, ipAddress?: string) {
    if (!dto.items?.length || dto.items.length > 100) throw new BadRequestException('Informe os itens recebidos.');
    if (new Set(dto.items.map(x => x.purchaseItemId)).size !== dto.items.length) throw new BadRequestException('Item repetido no recebimento.');
    const lines = dto.items.map(x => ({ purchaseItemId: x.purchaseItemId, quantity: this.qty(x.quantity, 'Quantidade recebida') }));
    return this.retry(() => this.prisma.$transaction(async tx => {
      // Idempotência: se uma resposta da API se perdeu, o reenvio não dará baixa novamente.
      const previousReceipt = await tx.purchaseReceipt.findUnique({ where: { operationId: dto.operationId } });
      if (previousReceipt) {
        if (previousReceipt.purchaseId !== purchaseId) throw new ConflictException('Identificador de operação já usado em outra compra.');
        return { duplicated: true, receiptId: previousReceipt.id, purchase: await tx.purchase.findUnique({ where: { id: purchaseId }, include: purchaseInclude }) };
      }
      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: { include: { product: true } } } });
      if (!purchase) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status === 'CANCELLED' || purchase.status === 'RECEIVED') throw new BadRequestException('Compra não permite novos recebimentos.');
      const validIds = new Map(purchase.items.map(i => [i.id, i]));
      for (const line of lines) {
        const item = validIds.get(line.purchaseItemId);
        if (!item) throw new BadRequestException('Item não pertence à compra.');
        if (item.product.unit === 'UN' && !line.quantity.isInteger()) throw new BadRequestException('Produto UN exige quantidade inteira.');
        if (line.quantity.gt(item.quantity.minus(item.receivedQuantity))) throw new BadRequestException(`Quantidade recebida maior que a pendente para ${item.product.name}.`);
        if (!item.product.active || !item.product.controlStock) throw new BadRequestException(`Produto ${item.product.name} está inativo ou sem controle de estoque.`);
      }
      const receipt = await tx.purchaseReceipt.create({ data: { purchaseId, receivedById: userId, operationId: dto.operationId, notes: dto.notes?.trim() || null } });
      for (const line of lines) {
        const item = validIds.get(line.purchaseItemId)!;
        const changedItem = await tx.purchaseItem.updateMany({
          where: { id: item.id, receivedQuantity: item.receivedQuantity },
          data: { receivedQuantity: { increment: line.quantity } },
        });
        if (changedItem.count !== 1) throw new ConflictException('A compra foi alterada por outro usuário. Atualize antes de receber.');
        const before = item.product.currentStock;
        const after = before.plus(line.quantity);
        if (after.gt(MAX_QTY)) throw new BadRequestException('Estoque excede o limite do cadastro.');
        const changedProduct = await tx.product.updateMany({
          where: { id: item.productId, currentStock: before, active: true, controlStock: true },
          data: { currentStock: { increment: line.quantity } },
        });
        if (changedProduct.count !== 1) throw new ConflictException('Estoque alterado simultaneamente. Tente novamente.');
        await tx.purchaseReceiptItem.create({ data: { receiptId: receipt.id, purchaseItemId: item.id, productId: item.productId, quantity: line.quantity, unitCost: item.unitCost } });
        await tx.stockMovement.create({ data: { productId: item.productId, userId, type: 'PURCHASE', quantity: line.quantity,
          previousStock: before, newStock: after, unitCost: item.unitCost, operationId: receipt.operationId,
          reason: `Recebimento compra #${purchase.number}`, observations: dto.notes?.trim() || null } });
      }
      const allItems = await tx.purchaseItem.findMany({ where: { purchaseId }, select: { quantity: true, receivedQuantity: true } });
      const done = allItems.every(i => i.receivedQuantity.gte(i.quantity));
      await tx.purchase.update({ where: { id: purchaseId }, data: { status: done ? 'RECEIVED' : 'PARTIALLY_RECEIVED' } });
      await tx.auditLog.create({ data: { userId, action: 'PURCHASE_RECEIVE', entity: 'PurchaseReceipt', entityId: receipt.id,
        description: `Recebimento de ${lines.length} item(ns) na compra #${purchase.number}.`, ipAddress } });
      return { duplicated: false, receiptId: receipt.id, purchase: await tx.purchase.findUnique({ where: { id: purchaseId }, include: purchaseInclude }) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }));
  }
}
