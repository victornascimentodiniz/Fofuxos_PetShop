import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CashSessionStatus, CashMovementType } from '../generated/prisma/enums';
import { CashMovementDto, CloseCashDto, OpenCashDto } from './dto/cash.dto';

const MAX_MONEY = new Prisma.Decimal('999999999999.99');

const SESSION_SELECT = {
  id: true,
  terminalCode: true,
  openedById: true,
  closedById: true,
  status: true,
  openingAmount: true,
  closingDeclaredAmount: true,
  openedAt: true,
  closedAt: true,
  notes: true,
  openedBy: { select: { id: true, name: true } },
  closedBy: { select: { id: true, name: true } },
} as const;

type Session = Prisma.CashSessionGetPayload<{ select: typeof SESSION_SELECT }>;
type CashTx = Prisma.TransactionClient;

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  private terminal(raw: string): string {
    const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) {
      throw new BadRequestException('Informe um terminal válido, como CAIXA-01.');
    }
    return code;
  }

  private money(value: string, allowZero: boolean): Prisma.Decimal {
    if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException('Valor monetário inválido.');
    }
    const d = new Prisma.Decimal(value);
    if (!d.isFinite() || d.gt(MAX_MONEY) || d.isNegative() || (!allowZero && d.isZero())) {
      throw new BadRequestException(allowZero ? 'O valor não pode ser negativo.' : 'Informe um valor maior que zero.');
    }
    return d;
  }

  private async retrySerializable<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034') {
            if (attempt < 2) continue;
            throw new ConflictException('Outra operação alterou o caixa. Tente novamente.');
          }
          if (error.code === 'P2002') {
            throw new ConflictException('Já existe um caixa aberto para este terminal.');
          }
        }
        throw error;
      }
    }
    throw new ConflictException('Não foi possível concluir a operação de caixa.');
  }

  private async openSession(tx: CashTx, terminalCode: string): Promise<Session> {
    const session = await tx.cashSession.findFirst({
      where: { terminalCode, status: CashSessionStatus.OPEN },
      select: SESSION_SELECT,
    });
    if (!session) throw new NotFoundException(`Não existe caixa aberto para o terminal ${terminalCode}.`);
    return session;
  }

  // O saldo físico considera apenas dinheiro. PIX e cartão não entram no caixa físico.
  // OPENING é lançado apenas quando a abertura é maior que zero.
  private async summary(tx: CashTx, session: Session) {
    const rows = await tx.cashMovement.groupBy({
      by: ['type'],
      where: { cashSessionId: session.id },
      _sum: { amount: true },
    });
    const totals: Record<string, Prisma.Decimal> = {};
    for (const row of rows) totals[row.type] = row._sum.amount ?? new Prisma.Decimal(0);
    const get = (key: CashMovementType) => totals[key] ?? new Prisma.Decimal(0);

    // openingAmount é a fonte da abertura; não somar o lançamento OPENING de novo.
    const expected = session.openingAmount
      .plus(get(CashMovementType.SUPPLY))
      .plus(get(CashMovementType.CASH_SALE))
      .minus(get(CashMovementType.WITHDRAWAL))
      .minus(get(CashMovementType.CASH_REFUND));

    const movements = await tx.cashMovement.count({ where: { cashSessionId: session.id } });
    const sales = await tx.sale.count({ where: { cashSessionId: session.id, status: 'COMPLETED' } });
    return {
      expectedCash: expected.toFixed(2),
      openingAmount: session.openingAmount.toFixed(2),
      supplyAmount: get(CashMovementType.SUPPLY).toFixed(2),
      withdrawalAmount: get(CashMovementType.WITHDRAWAL).toFixed(2),
      cashSalesAmount: get(CashMovementType.CASH_SALE).toFixed(2),
      cashRefundAmount: get(CashMovementType.CASH_REFUND).toFixed(2),
      movements,
      sales,
    };
  }

  private serialize(session: Session) {
    return {
      ...session,
      openingAmount: session.openingAmount.toFixed(2),
      closingDeclaredAmount: session.closingDeclaredAmount?.toFixed(2) ?? null,
    };
  }

  async current(code: string) {
    const terminalCode = this.terminal(code);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { terminalCode, status: CashSessionStatus.OPEN },
        select: SESSION_SELECT,
      });
      if (!session) return null;
      return { ...this.serialize(session), summary: await this.summary(tx, session) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async open(dto: OpenCashDto, userId: string, ipAddress?: string) {
    const terminalCode = this.terminal(dto.terminalCode);
    const openingAmount = this.money(dto.openingAmount, true);
    return this.retrySerializable(() => this.prisma.$transaction(async (tx) => {
      const existing = await tx.cashSession.findFirst({
        where: { terminalCode, status: CashSessionStatus.OPEN }, select: { id: true },
      });
      if (existing) throw new ConflictException(`O terminal ${terminalCode} já possui um caixa aberto.`);

      const session = await tx.cashSession.create({
        data: { terminalCode, openedById: userId, openingAmount, notes: dto.notes?.trim() || null },
        select: SESSION_SELECT,
      });
      // Restrição CHECK exige movimento positivo, portanto abertura zero não gera movimento.
      if (openingAmount.gt(0)) {
        await tx.cashMovement.create({ data: {
          cashSessionId: session.id, userId, type: CashMovementType.OPENING,
          amount: openingAmount, reason: 'Abertura do caixa',
        } });
      }
      await tx.auditLog.create({ data: {
        userId, action: 'POS_CASH_OPEN', entity: 'CashSession', entityId: session.id,
        description: `Caixa ${terminalCode} aberto com R$ ${openingAmount.toFixed(2)}.`, ipAddress,
      } });
      return { ...this.serialize(session), summary: await this.summary(tx, session) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async movement(type: 'SUPPLY' | 'WITHDRAWAL', dto: CashMovementDto, userId: string, ipAddress?: string) {
    const terminalCode = this.terminal(dto.terminalCode);
    const amount = this.money(dto.amount, false);
    const reason = dto.reason.trim();
    if (reason.length < 3 || reason.length > 180) throw new BadRequestException('Informe um motivo entre 3 e 180 caracteres.');

    return this.retrySerializable(() => this.prisma.$transaction(async (tx) => {
      const session = await this.openSession(tx, terminalCode);
      if (type === 'WITHDRAWAL') {
        const summary = await this.summary(tx, session);
        if (amount.gt(new Prisma.Decimal(summary.expectedCash))) {
          throw new BadRequestException('Sangria maior que o dinheiro disponível no caixa.');
        }
      }
      const movement = await tx.cashMovement.create({ data: {
        cashSessionId: session.id, userId, type: type === 'SUPPLY' ? CashMovementType.SUPPLY : CashMovementType.WITHDRAWAL,
        amount, reason, notes: dto.notes?.trim() || null,
      }, select: { id: true, type: true, amount: true, reason: true, createdAt: true } });
      await tx.auditLog.create({ data: {
        userId, action: `POS_CASH_${type}`, entity: 'CashMovement', entityId: movement.id,
        description: `${type === 'SUPPLY' ? 'Suprimento' : 'Sangria'} de R$ ${amount.toFixed(2)} no ${terminalCode}. Motivo: ${reason}.`, ipAddress,
      } });
      return {
        ...movement, amount: movement.amount.toFixed(2),
        sessionId: session.id, summary: await this.summary(tx, session),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async close(dto: CloseCashDto, userId: string, ipAddress?: string) {
    const terminalCode = this.terminal(dto.terminalCode);
    const declared = this.money(dto.closingDeclaredAmount, true);
    return this.retrySerializable(() => this.prisma.$transaction(async (tx) => {
      const session = await this.openSession(tx, terminalCode);
      const summary = await this.summary(tx, session);
      const expected = new Prisma.Decimal(summary.expectedCash);
      const difference = declared.minus(expected);
      const now = new Date();
      const updated = await tx.cashSession.updateMany({
        where: { id: session.id, status: CashSessionStatus.OPEN },
        data: {
          status: CashSessionStatus.CLOSED, closedAt: now,
          closedById: userId, closingDeclaredAmount: declared,
          // O campo notes pertence à abertura; não sobrescrever observações anteriores.
          notes: dto.notes?.trim() ? [session.notes, `Fechamento: ${dto.notes.trim()}`].filter(Boolean).join('\n') : undefined,
        },
      });
      if (updated.count !== 1) throw new ConflictException('O caixa já foi fechado por outra operação.');
      await tx.auditLog.create({ data: {
        userId, action: 'POS_CASH_CLOSE', entity: 'CashSession', entityId: session.id,
        description: `Caixa ${terminalCode} fechado. Esperado R$ ${expected.toFixed(2)}; declarado R$ ${declared.toFixed(2)}; diferença R$ ${difference.toFixed(2)}.`,
        ipAddress,
      } });
      return {
        id: session.id, terminalCode, status: CashSessionStatus.CLOSED, closedAt: now,
        closingDeclaredAmount: declared.toFixed(2), expectedCash: expected.toFixed(2),
        difference: difference.toFixed(2), summary,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async history(rawTerminal?: string, pageText?: string, limitText?: string) {
    const terminalCode = rawTerminal === undefined ? undefined : this.terminal(rawTerminal);
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Paginação inválida.');
    }
    const where: Prisma.CashSessionWhereInput = terminalCode ? { terminalCode } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cashSession.findMany({
        where, select: SESSION_SELECT, orderBy: { openedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.cashSession.count({ where }),
    ]);
    return {
      data: data.map((session) => this.serialize(session)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
