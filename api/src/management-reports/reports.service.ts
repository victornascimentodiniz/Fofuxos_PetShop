import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const D = Prisma.Decimal;
const zero = () => new D(0);
const money = (value: Prisma.Decimal | number | null | undefined) => new D(value ?? 0).toFixed(2);

const saleSelect = {
  id: true, number: true, status: true, subtotal: true, discountAmount: true,
  totalAmount: true, notes: true, createdAt: true,
  operator: { select: { id: true, name: true } },
  cashSession: { select: { id: true, terminalCode: true, openedAt: true } },
  items: { select: { id: true, productId: true, productName: true, unit: true, quantity: true, unitPrice: true, totalAmount: true } },
  payments: { select: { id: true, method: true, amount: true, receivedAmount: true, changeAmount: true, reference: true } },
} as const;

type SaleRecord = Prisma.SaleGetPayload<{ select: typeof saleSelect }>;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(start?: string, end?: string, defaultDays = 30) {
    // Datas enviadas em ISO UTC pelo browser, preservando o fuso selecionado.
    const now = new Date();
    const from = start ? new Date(start) : new Date(now.getTime() - defaultDays * 86400000);
    const to = end ? new Date(end) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to || to.getTime() - from.getTime() > 366 * 86400000) {
      throw new BadRequestException('Período inválido: início deve ser anterior ao fim, com até 366 dias.');
    }
    return { gte: from, lt: to };
  }

  private paging(pageText?: string, limitText?: string) {
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || (page - 1) * limit > 1000000) {
      throw new BadRequestException('Paginação inválida.');
    }
    return { page, limit, skip: (page - 1) * limit };
  }

  private terminal(value?: string) {
    if (!value?.trim()) return undefined;
    const code = value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) throw new BadRequestException('Terminal inválido.');
    return code;
  }

  private saleOutput(s: SaleRecord) {
    return {
      ...s, subtotal: money(s.subtotal), discountAmount: money(s.discountAmount), totalAmount: money(s.totalAmount),
      items: s.items.map((i) => ({ ...i, quantity: i.quantity.toFixed(3), unitPrice: money(i.unitPrice), totalAmount: money(i.totalAmount) })),
      payments: s.payments.map((p) => ({ ...p, amount: money(p.amount), receivedAmount: p.receivedAmount ? money(p.receivedAmount) : null, changeAmount: money(p.changeAmount) })),
    };
  }

  private async settlement(sessionId: string, opening: Prisma.Decimal, declared: Prisma.Decimal | null) {
    const [movements, paymentGroups, completedSales] = await Promise.all([
      this.prisma.cashMovement.groupBy({ by: ['type'], where: { cashSessionId: sessionId }, _sum: { amount: true } }),
      this.prisma.salePayment.groupBy({ by: ['method'], where: { sale: { cashSessionId: sessionId, status: 'COMPLETED' } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.sale.aggregate({ where: { cashSessionId: sessionId, status: 'COMPLETED' }, _sum: { totalAmount: true, discountAmount: true }, _count: { _all: true } }),
    ]);
    const movementValue = (type: string) => movements.find((m) => m.type === type)?._sum.amount ?? zero();
    const expected = opening.plus(movementValue('SUPPLY')).plus(movementValue('CASH_SALE'))
      .minus(movementValue('WITHDRAWAL')).minus(movementValue('CASH_REFUND'));
    return {
      openingAmount: money(opening), expectedCash: money(expected), declaredCash: declared === null ? null : money(declared),
      difference: declared === null ? null : money(declared.minus(expected)),
      supplies: money(movementValue('SUPPLY')), withdrawals: money(movementValue('WITHDRAWAL')),
      cashSales: money(movementValue('CASH_SALE')), cashRefunds: money(movementValue('CASH_REFUND')),
      salesCount: completedSales._count._all,
      salesTotal: money(completedSales._sum.totalAmount), discounts: money(completedSales._sum.discountAmount),
      payments: paymentGroups.map((p) => ({ method: p.method, amount: money(p._sum.amount), count: p._count._all })),
    };
  }

  async sessions(start?: string, end?: string, terminal?: string, status?: string, pageText?: string, limitText?: string) {
    const { page, limit, skip } = this.paging(pageText, limitText);
    if (status && !['OPEN', 'CLOSED'].includes(status)) throw new BadRequestException('Status inválido.');
    const where: Prisma.CashSessionWhereInput = {
      openedAt: this.range(start, end),
      ...(this.terminal(terminal) ? { terminalCode: this.terminal(terminal) } : {}),
      ...(status ? { status: status as 'OPEN' | 'CLOSED' } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.cashSession.findMany({ where, skip, take: limit, orderBy: { openedAt: 'desc' },
        select: { id: true, terminalCode: true, openedAt: true, closedAt: true, status: true,
          openingAmount: true, closingDeclaredAmount: true,
          openedBy: { select: { id: true, name: true } }, closedBy: { select: { id: true, name: true } },
          _count: { select: { sales: true } },
        } }),
      this.prisma.cashSession.count({ where }),
    ]);
    return { data: rows.map((r) => ({ ...r, openingAmount: money(r.openingAmount), closingDeclaredAmount: r.closingDeclaredAmount ? money(r.closingDeclaredAmount) : null,
      salesCount: r._count.sales, _count: undefined })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async session(id: string) {
    const row = await this.prisma.cashSession.findUnique({ where: { id },
      select: { id: true, terminalCode: true, openedAt: true, closedAt: true, status: true,
        openingAmount: true, closingDeclaredAmount: true, notes: true,
        openedBy: { select: { id: true, name: true } }, closedBy: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'asc' }, select: { id: true, type: true, amount: true, reason: true, notes: true, createdAt: true,
          user: { select: { id: true, name: true } }, saleId: true } },
        sales: { orderBy: { createdAt: 'desc' }, select: saleSelect },
      } });
    if (!row) throw new NotFoundException('Caixa não encontrado.');
    return {
      ...row, openingAmount: money(row.openingAmount), closingDeclaredAmount: row.closingDeclaredAmount ? money(row.closingDeclaredAmount) : null,
      movements: row.movements.map((m) => ({ ...m, amount: money(m.amount) })),
      sales: row.sales.map((s) => this.saleOutput(s)),
      settlement: await this.settlement(id, row.openingAmount, row.closingDeclaredAmount),
    };
  }

  async sales(start?: string, end?: string, terminal?: string, operatorId?: string, status?: string, pageText?: string, limitText?: string) {
    const { page, limit, skip } = this.paging(pageText, limitText);
    if (status && !['COMPLETED', 'CANCELLED'].includes(status)) throw new BadRequestException('Status de venda inválido.');
    if (operatorId && !/^[a-f0-9-]{36}$/i.test(operatorId)) throw new BadRequestException('Operador inválido.');
    const code = this.terminal(terminal);
    const where: Prisma.SaleWhereInput = { createdAt: this.range(start, end),
      ...(code ? { cashSession: { terminalCode: code } } : {}),
      ...(operatorId ? { operatorId } : {}),
      ...(status ? { status: status as 'COMPLETED' | 'CANCELLED' } : {}),
    };
    const [rows, total, aggregates] = await Promise.all([
      this.prisma.sale.findMany({ where, skip, take: limit, orderBy: [{ createdAt: 'desc' }, { number: 'desc' }], select: saleSelect }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { totalAmount: true }, _count: { _all: true } }),
    ]);
    return { data: rows.map((s) => this.saleOutput(s)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      completedCount: aggregates._count._all, completedTotal: money(aggregates._sum.totalAmount) };
  }

  async sale(id: string) {
    const row = await this.prisma.sale.findUnique({ where: { id }, select: saleSelect });
    if (!row) throw new NotFoundException('Venda não encontrada.');
    return this.saleOutput(row);
  }

  private salesWhere(start?: string, end?: string, terminal?: string, operatorId?: string, status?: string): Prisma.SaleWhereInput {
    const code = this.terminal(terminal);
    if (operatorId && !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(operatorId)) {
      throw new BadRequestException('Operador inválido.');
    }
    if (status && !['COMPLETED', 'CANCELLED'].includes(status)) throw new BadRequestException('Situação inválida.');
    return {
      createdAt: this.range(start, end),
      ...(code ? { cashSession: { terminalCode: code } } : {}),
      ...(operatorId ? { operatorId } : {}),
      ...(status ? { status: status as 'COMPLETED' | 'CANCELLED' } : {}),
    };
  }

  async financialSummary(start?: string, end?: string, terminal?: string, operatorId?: string) {
    const where = this.salesWhere(start, end, terminal, operatorId, 'COMPLETED');
    const [sales, payments, operators, products] = await Promise.all([
      this.prisma.sale.aggregate({ where, _sum: { totalAmount: true, subtotal: true, discountAmount: true }, _count: { _all: true } }),
      this.prisma.salePayment.groupBy({ by: ['method'], where: { sale: where }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.sale.groupBy({ by: ['operatorId'], where, _sum: { totalAmount: true }, _count: { _all: true } }),
      this.prisma.saleItem.groupBy({ by: ['productName', 'unit'], where: { sale: where },
        _sum: { quantity: true, totalAmount: true }, _count: { _all: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 10 }),
    ]);
    const people = await this.prisma.user.findMany({
      where: { id: { in: operators.map((row) => row.operatorId) } },
      select: { id: true, name: true },
    });
    const names = new Map(people.map((person) => [person.id, person.name]));
    return {
      period: this.range(start, end),
      salesCount: sales._count._all,
      revenue: money(sales._sum.totalAmount),
      subtotal: money(sales._sum.subtotal),
      discounts: money(sales._sum.discountAmount),
      averageTicket: sales._count._all
        ? money((sales._sum.totalAmount ?? zero()).div(sales._count._all)) : '0.00',
      payments: payments.map((p) => ({ method: p.method, amount: money(p._sum.amount), count: p._count._all })),
      operators: operators.map((o) => ({
        id: o.operatorId, name: names.get(o.operatorId) ?? 'Usuário indisponível',
        count: o._count._all, total: money(o._sum.totalAmount),
      })).sort((a, b) => Number(b.total) - Number(a.total)),
      topProducts: products.map((p) => ({ name: p.productName, unit: p.unit,
        quantity: p._sum.quantity?.toFixed(3) ?? '0.000', total: money(p._sum.totalAmount) })),
    };
  }

  private csv(rows: (string | number | null | undefined)[][]) {
    const escape = (value: string | number | null | undefined) => {
      let cell = String(value ?? '');
      // Prevent spreadsheet formula injection even when cell text starts with spaces.
      if (/^[\t\r\n ]*[=+@-]/.test(cell) && typeof value !== 'number') cell = "'" + cell;
      return '"' + cell.replace(/"/g, '""') + '"';
    };
    return '\uFEFF' + rows.map((r) => r.map(escape).join(';')).join('\r\n') + '\r\n';
  }

  private csvDate(date: Date | null | undefined) {
    return date ? new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium', hour12: false,
    }).format(date) : '';
  }

  async exportSales(start?: string, end?: string, terminal?: string, operatorId?: string, status?: string) {
    const where = this.salesWhere(start, end, terminal, operatorId, status);
    const max = 10000;
    const records = await this.prisma.sale.findMany({ where, orderBy: { createdAt: 'desc' }, take: max + 1,
      select: {
        number: true, createdAt: true, status: true, subtotal: true, discountAmount: true, totalAmount: true,
        operator: { select: { name: true } }, cashSession: { select: { terminalCode: true, openedAt: true } },
        items: { select: { productName: true, unit: true, quantity: true, unitPrice: true, totalAmount: true } },
        payments: { select: { method: true, amount: true } },
      },
    });
    if (records.length > max) throw new BadRequestException('Mais de 10.000 vendas no período. Reduza o intervalo para exportar.');
    const rows: (string | number | null | undefined)[][] = [[
      'Número da venda', 'Data/hora', 'Situação', 'Terminal', 'Abertura do caixa', 'Operador',
      'Produto', 'Unidade', 'Quantidade', 'Preço unitário', 'Total do item',
      'Subtotal da venda', 'Desconto da venda', 'Total da venda', 'Pagamentos',
    ]];
    for (const record of records) {
      const base = [record.number, this.csvDate(record.createdAt), record.status, record.cashSession.terminalCode,
        this.csvDate(record.cashSession.openedAt), record.operator.name];
      const methods = record.payments.map((p) => `${p.method}: ${money(p.amount)}`).join(' | ');
      const items = record.items.length ? record.items : [null];
      for (const item of items) rows.push([
        ...base, item?.productName, item?.unit, item?.quantity?.toFixed(3),
        item ? money(item.unitPrice) : '', item ? money(item.totalAmount) : '',
        money(record.subtotal), money(record.discountAmount), money(record.totalAmount), methods,
      ]);
    }
    return this.csv(rows);
  }

  async exportCashSessions(start?: string, end?: string, terminal?: string, status?: string) {
    if (status && !['OPEN', 'CLOSED'].includes(status)) throw new BadRequestException('Situação inválida.');
    const code = this.terminal(terminal);
    const max = 5000;
    const sessions = await this.prisma.cashSession.findMany({
      where: { openedAt: this.range(start, end), ...(code ? { terminalCode: code } : {}),
        ...(status ? { status: status as 'OPEN' | 'CLOSED' } : {}) },
      orderBy: { openedAt: 'desc' }, take: max + 1,
      select: { id: true, terminalCode: true, status: true, openedAt: true, closedAt: true,
        openingAmount: true, closingDeclaredAmount: true,
        openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
    });
    if (sessions.length > max) throw new BadRequestException('Mais de 5.000 caixas no período. Reduza o intervalo para exportar.');
    const ids = sessions.map((s) => s.id);
    const [movements, sales] = ids.length ? await Promise.all([
      this.prisma.cashMovement.groupBy({ by: ['cashSessionId', 'type'], where: { cashSessionId: { in: ids } }, _sum: { amount: true } }),
      this.prisma.sale.groupBy({ by: ['cashSessionId'], where: { cashSessionId: { in: ids }, status: 'COMPLETED' },
        _sum: { totalAmount: true }, _count: { _all: true } }),
    ]) : [[], []];
    const movementMap = new Map(movements.map((m) => [`${m.cashSessionId}/${m.type}`, m._sum.amount ?? zero()]));
    const movement = (id: string, type: string) => movementMap.get(`${id}/${type}`) ?? zero();
    const salesMap = new Map(sales.map((s) => [s.cashSessionId, s]));
    const rows: (string | number | null | undefined)[][] = [[
      'Terminal', 'Situação', 'Data/hora abertura', 'Aberto por', 'Valor inicial',
      'Data/hora fechamento', 'Fechado por', 'Suprimentos', 'Sangrias',
      'Vendas em dinheiro', 'Estornos em dinheiro', 'Dinheiro esperado',
      'Dinheiro declarado', 'Diferença', 'Quantidade de vendas', 'Total de vendas',
    ]];
    for (const s of sessions) {
      const expected = s.openingAmount.plus(movement(s.id, 'SUPPLY')).plus(movement(s.id, 'CASH_SALE'))
        .minus(movement(s.id, 'WITHDRAWAL')).minus(movement(s.id, 'CASH_REFUND'));
      rows.push([s.terminalCode, s.status, this.csvDate(s.openedAt), s.openedBy.name, money(s.openingAmount),
        this.csvDate(s.closedAt), s.closedBy?.name,
        money(movement(s.id, 'SUPPLY')), money(movement(s.id, 'WITHDRAWAL')),
        money(movement(s.id, 'CASH_SALE')), money(movement(s.id, 'CASH_REFUND')), money(expected),
        s.closingDeclaredAmount === null ? '' : money(s.closingDeclaredAmount),
        s.closingDeclaredAmount === null ? '' : money(s.closingDeclaredAmount.minus(expected)),
        salesMap.get(s.id)?._count._all ?? 0, money(salesMap.get(s.id)?._sum.totalAmount),
      ]);
    }
    return this.csv(rows);
  }

  async dashboard(start?: string, end?: string) {
    const range = this.range(start, end, 7);
    const where: Prisma.SaleWhereInput = { createdAt: range, status: 'COMPLETED' };
    const [salesAgg, paymentGroups, cashOpen, cashClosed, recentSales, lowStock, dailyRows] = await Promise.all([
      this.prisma.sale.aggregate({ where, _sum: { totalAmount: true, discountAmount: true }, _count: { _all: true } }),
      this.prisma.salePayment.groupBy({ by: ['method'], where: { sale: where }, _sum: { amount: true } }),
      this.prisma.cashSession.count({ where: { status: 'OPEN' } }),
      this.prisma.cashSession.count({ where: { status: 'CLOSED', closedAt: range } }),
      this.prisma.sale.findMany({ where, select: saleSelect, orderBy: { createdAt: 'desc' }, take: 8 }),
      // Compara colunas no próprio banco: não inventa limite fixo para estoque.
      this.prisma.$queryRaw<{ id: string; name: string; unit: string; current_stock: Prisma.Decimal; min_stock: Prisma.Decimal }[]>`
        SELECT id, name, unit::text AS unit, current_stock, min_stock
        FROM products WHERE active = true AND control_stock = true
          AND current_stock <= min_stock ORDER BY current_stock ASC LIMIT 8
      `,
      this.prisma.$queryRaw<{ day: Date; total: Prisma.Decimal; quantity: bigint }[]>`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS day,
          SUM(total_amount) AS total, COUNT(*) AS quantity
        FROM sales WHERE status = 'COMPLETED' AND created_at >= ${range.gte} AND created_at < ${range.lt}
        GROUP BY 1 ORDER BY 1
      `,
    ]);
    return {
      period: { start: range.gte.toISOString(), end: range.lt.toISOString(), timezone: 'America/Sao_Paulo' },
      totalSales: salesAgg._count._all, revenue: money(salesAgg._sum.totalAmount), discounts: money(salesAgg._sum.discountAmount),
      openCashSessions: cashOpen, closedCashSessions: cashClosed,
      payments: paymentGroups.map((p) => ({ method: p.method, amount: money(p._sum.amount) })),
      recentSales: recentSales.map((s) => this.saleOutput(s)),
      lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, unit: p.unit, currentStock: p.current_stock.toFixed(3), minStock: p.min_stock.toFixed(3) })),
      daily: dailyRows.map((r) => ({ day: r.day.toISOString().slice(0, 10), total: money(r.total), count: Number(r.quantity) })),
    };
  }
}
