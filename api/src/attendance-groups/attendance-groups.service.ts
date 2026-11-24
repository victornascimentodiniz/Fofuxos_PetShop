import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAttendanceGroupDto } from './dto/attendance-group.dto';

const groupInclude = {
  items: { orderBy: { sortOrder: 'asc' }, include: { product: { select: {
    id: true, code: true, barcode: true, name: true, unit: true, saleType: true,
    salePrice: true, currentStock: true, controlStock: true, active: true,
  } } } },
} satisfies Prisma.AttendanceGroupInclude;

@Injectable()
export class AttendanceGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(group: any) {
    return {
      id: group.id, name: group.name, icon: group.icon, color: group.color,
      sortOrder: group.sortOrder, active: group.active, createdAt: group.createdAt,
      products: group.items.map((entry: any) => ({
        ...entry.product,
        salePrice: entry.product.salePrice.toFixed(2),
        currentStock: entry.product.currentStock.toFixed(3),
      })),
      productIds: group.items.map((entry: any) => entry.productId),
    };
  }

  async list(activeOnly = false) {
    const groups = await this.prisma.attendanceGroup.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: groupInclude,
    });
    return groups.map((group) => this.serialize({
      ...group, items: activeOnly ? group.items.filter((i) => i.product.active) : group.items,
    }));
  }

  async catalogProducts(search = '') {
    const term = search.trim().slice(0, 100);
    const code = /^\d+$/.test(term) ? Number(term) : NaN;
    const products = await this.prisma.product.findMany({
      where: { active: true, ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term, mode: 'insensitive' } },
        ...(Number.isSafeInteger(code) ? [{ code }] : []),
      ] } : {}) },
      select: { id: true, name: true, code: true, unit: true, salePrice: true },
      take: 100, orderBy: { name: 'asc' },
    });
    return products.map((product) => ({ ...product, salePrice: product.salePrice.toFixed(2) }));
  }

  private async validate(dto: SaveAttendanceGroupDto) {
    const name = dto.name?.trim();
    if (!name || name.length < 2) throw new BadRequestException('Informe um nome com pelo menos dois caracteres.');
    const ids = [...new Set(dto.productIds)];
    if (ids.length !== dto.productIds.length) throw new BadRequestException('Não repita produtos no grupo.');
    const products = await this.prisma.product.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } });
    if (products.length !== ids.length) throw new BadRequestException('Algum produto informado não existe ou está inativo.');
    return { name, ids };
  }

  async create(dto: SaveAttendanceGroupDto) {
    const { name, ids } = await this.validate(dto);
    try {
      const group = await this.prisma.attendanceGroup.create({
        data: { name, icon: dto.icon ?? 'package', color: dto.color ?? '#AD4679', sortOrder: dto.sortOrder ?? 0,
          active: dto.active ?? true,
          items: { create: ids.map((productId, sortOrder) => ({ productId, sortOrder })) },
        }, include: groupInclude,
      });
      return this.serialize(group);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Já existe um grupo com este nome.');
      throw e;
    }
  }

  async update(id: string, dto: SaveAttendanceGroupDto) {
    const { name, ids } = await this.validate(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const exists = await tx.attendanceGroup.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new NotFoundException('Grupo de atendimento não encontrado.');
        await tx.attendanceGroupProduct.deleteMany({ where: { groupId: id } });
        const group = await tx.attendanceGroup.update({
          where: { id }, data: { name, icon: dto.icon ?? 'package', color: dto.color ?? '#AD4679',
            sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true,
            items: { create: ids.map((productId, sortOrder) => ({ productId, sortOrder })) },
          }, include: groupInclude,
        });
        return this.serialize(group);
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Já existe um grupo com este nome.');
      throw e;
    }
  }
}
