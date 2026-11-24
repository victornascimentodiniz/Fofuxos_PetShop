import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockFractionationDto } from './dto/stock-fractionation.dto';

const MAX_STOCK = new Prisma.Decimal('99999999999.999');
const MAX_COST = new Prisma.Decimal('9999999999.9999');
const MAX_TOTAL_COST = new Prisma.Decimal('999999999999.9999');

@Injectable()
export class StockFractionationService {
  constructor(private readonly prisma: PrismaService) {}

  private pageParams(pageText?: string, limitText?: string) {
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Paginação inválida. Use página >= 1 e limite entre 1 e 100.');
    }
    return { page, limit, skip: (page - 1) * limit };
  }

  async history(pageText?: string, limitText?: string) {
    const pg = this.pageParams(pageText, limitText);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockFractionation.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pg.skip,
        take: pg.limit,
        select: {
          id: true, packages: true, conversionFactor: true, grossQuantity: true,
          lossQuantity: true, netQuantity: true, observations: true, createdAt: true,
          sourceProduct: { select: { id: true, code: true, name: true, unit: true } },
          destinationProduct: { select: { id: true, code: true, name: true, unit: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockFractionation.count(),
    ]);
    return {
      data: rows.map((r) => ({ ...r,
        conversionFactor: r.conversionFactor.toFixed(3),
        grossQuantity: r.grossQuantity.toFixed(3),
        lossQuantity: r.lossQuantity.toFixed(3),
        netQuantity: r.netQuantity.toFixed(3),
      })),
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) },
    };
  }

  async fractionate(dto: StockFractionationDto, userId: string, ipAddress?: string) {
    // Revalidar mesmo quando ValidationPipe global estiver desativado.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.sourceProductId)) {
      throw new BadRequestException('Produto de origem inválido.');
    }
    if (!Number.isSafeInteger(dto.packages) || dto.packages < 1 || dto.packages > 100000000) {
      throw new BadRequestException('Informe uma quantidade inteira de embalagens maior que zero.');
    }
    const lossText = dto.lossQuantity ?? '0';
    if (typeof lossText !== 'string' || !/^\d{1,11}(\.\d{1,3})?$/.test(lossText)) {
      throw new BadRequestException('Perda inválida (máximo de três casas decimais).');
    }
    const loss = new Prisma.Decimal(lossText);
    const observations = dto.observations?.trim() || null;
    if (observations && observations.length > 2000) {
      throw new BadRequestException('Observações excedem 2000 caracteres.');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const rule = await tx.productConversion.findUnique({
            where: { sourceProductId: dto.sourceProductId },
            select: { active: true, sourceProductId: true, destinationProductId: true, conversionFactor: true },
          });
          if (!rule || !rule.active) {
            throw new NotFoundException('Este produto não possui uma regra de fracionamento ativa.');
          }
          if (rule.sourceProductId === rule.destinationProductId) {
            throw new BadRequestException('Origem e destino precisam ser diferentes.');
          }
          if (rule.conversionFactor.lte(0) || rule.conversionFactor.decimalPlaces() > 3) {
            throw new BadRequestException('Fator de conversão inválido.');
          }
          const products = await tx.product.findMany({
            where: { id: { in: [rule.sourceProductId, rule.destinationProductId] } },
            select: { id: true, name: true, active: true, controlStock: true, unit: true, saleType: true, currentStock: true, costPrice: true },
          });
          const source = products.find((p) => p.id === rule.sourceProductId);
          const destination = products.find((p) => p.id === rule.destinationProductId);
          if (!source || !destination) throw new NotFoundException('Produto de origem ou destino não encontrado.');
          if (!source.active || !destination.active || !source.controlStock || !destination.controlStock) {
            throw new BadRequestException('Os dois produtos devem estar ativos e controlar estoque.');
          }
          if (source.unit !== 'UN' || source.saleType !== 'UNIT') {
            throw new BadRequestException('A origem deve ser vendida por unidade (UN).');
          }
          if (!((destination.unit === 'KG' && destination.saleType === 'WEIGHT') ||
            (destination.unit === 'UN' && destination.saleType === 'UNIT'))) {
            throw new BadRequestException('O destino deve ser vendido em KG por peso ou em UN por unidade.');
          }
          if (source.currentStock.lt(dto.packages)) {
            throw new BadRequestException(`Estoque insuficiente de embalagens. Disponível: ${source.currentStock.toFixed(3)} UN.`);
          }
          const gross = rule.conversionFactor.mul(dto.packages);
          const net = gross.minus(loss);
          if (gross.gt(MAX_STOCK) || net.lte(0) || loss.isNegative() || loss.gte(gross)) {
            throw new BadRequestException('Perda ou quantidade gerada inválida. A quantidade líquida deve ser positiva.');
          }
          if (destination.unit === 'UN' && (!net.isInteger() || !loss.isInteger())) {
            throw new BadRequestException('Fracionamento em UN exige quantidades inteiras.');
          }
          const afterSource = source.currentStock.minus(dto.packages);
          const afterDestination = destination.currentStock.plus(net);
          if (afterDestination.gt(MAX_STOCK)) {
            throw new BadRequestException('Estoque de destino excederia a capacidade do campo.');
          }
          // O custo total da embalagem é absorvido pelo produto líquido recebido;
          // eventual perda aumenta o custo por unidade restante.
          const totalCost = source.costPrice.mul(dto.packages).toDecimalPlaces(4);
          const incomingUnitCost = totalCost.div(net).toDecimalPlaces(4);
          const destinationValue = destination.currentStock.mul(destination.costPrice);
          const newAverageCost = destinationValue.plus(totalCost).div(afterDestination).toDecimalPlaces(4);
          if (totalCost.gt(MAX_TOTAL_COST) || incomingUnitCost.gt(MAX_COST) || newAverageCost.gt(MAX_COST)) {
            throw new BadRequestException('Custo excede a capacidade do campo no banco de dados.');
          }
          // Comparação de saldo evita atualizar com uma leitura antiga. Serializable
          // impede que duas transações movimentem o mesmo estoque simultaneamente.
          const sourceUpdate = await tx.product.updateMany({
            where: { id: source.id, active: true, controlStock: true, currentStock: source.currentStock, costPrice: source.costPrice },
            data: { currentStock: afterSource },
          });
          if (sourceUpdate.count !== 1) throw new ConflictException('Embalagens alteradas por outra operação. Tente novamente.');
          const destinationUpdate = await tx.product.updateMany({
            where: { id: destination.id, active: true, controlStock: true, currentStock: destination.currentStock, costPrice: destination.costPrice },
            data: { currentStock: afterDestination, costPrice: newAverageCost },
          });
          if (destinationUpdate.count !== 1) throw new ConflictException('Estoque de destino alterado por outra operação. Tente novamente.');
          // A regra pode mudar simultaneamente: detectar alteração antes de finalizar.
          const ruleCheck = await tx.productConversion.findUnique({
            where: { sourceProductId: source.id },
            select: { active: true, destinationProductId: true, conversionFactor: true },
          });
          if (!ruleCheck || !ruleCheck.active || ruleCheck.destinationProductId !== destination.id ||
            !ruleCheck.conversionFactor.eq(rule.conversionFactor)) {
            throw new ConflictException('Regra de conversão modificada durante a operação. Tente novamente.');
          }
          const record = await tx.stockFractionation.create({
            data: {
              sourceProductId: source.id,
              destinationProductId: destination.id,
              userId,
              packages: dto.packages,
              conversionFactor: rule.conversionFactor,
              grossQuantity: gross,
              lossQuantity: loss,
              netQuantity: net,
              sourceUnitCost: source.costPrice,
              totalCost,
              destinationUnitCost: incomingUnitCost,
              observations,
            },
          });
          await tx.stockMovement.createMany({
            data: [
              {
                productId: source.id, userId, type: 'FRACTION_OUT', quantity: new Prisma.Decimal(-dto.packages),
                previousStock: source.currentStock, newStock: afterSource, unitCost: source.costPrice,
                operationId: record.id, reason: `Fracionamento para ${destination.name}`.slice(0, 150), observations,
              },
              {
                productId: destination.id, userId, type: 'FRACTION_IN', quantity: net,
                previousStock: destination.currentStock, newStock: afterDestination, unitCost: incomingUnitCost,
                operationId: record.id, reason: `Fracionamento de ${source.name}`.slice(0, 150), observations,
              },
            ],
          });
          await tx.auditLog.create({
            data: {
              userId, action: 'STOCK_FRACTIONATE', entity: 'StockFractionation', entityId: record.id,
              description: `Fracionamento: ${dto.packages} UN de "${source.name}" -> ${net.toFixed(3)} ${destination.unit} de "${destination.name}" (perda ${loss.toFixed(3)}).`,
              ipAddress,
            },
          });
          // Não expor custos ao usuário que possui somente stock.fraction.
          return {
            id: record.id, createdAt: record.createdAt, packages: dto.packages,
            sourceProduct: { id: source.id, name: source.name, unit: source.unit },
            destinationProduct: { id: destination.id, name: destination.name, unit: destination.unit },
            conversionFactor: rule.conversionFactor.toFixed(3),
            grossQuantity: gross.toFixed(3), lossQuantity: loss.toFixed(3), netQuantity: net.toFixed(3),
            sourceStock: { before: source.currentStock.toFixed(3), after: afterSource.toFixed(3) },
            destinationStock: { before: destination.currentStock.toFixed(3), after: afterDestination.toFixed(3) },
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          throw new ConflictException('Operação concorrente detectada. Tente novamente.');
        }
        throw error;
      }
    }
    throw new ConflictException('Não foi possível concluir o fracionamento.');
  }
}
