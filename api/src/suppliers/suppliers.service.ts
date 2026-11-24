import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

const FIELDS = [
  'name', 'tradeName', 'document', 'stateRegistration', 'email', 'phone',
  'contactName', 'zipCode', 'street', 'addressNumber', 'complement',
  'neighborhood', 'city', 'state', 'observations',
] as const;
type SupplierField = typeof FIELDS[number];
type SupplierData = { [K in SupplierField]?: string | null };

function digits(value: string) { return value.replace(/\D/g, ''); }
function validCpf(value: string): boolean {
  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) return false;
  for (let length = 9; length < 11; length++) {
    const sum = [...value.slice(0, length)].reduce((acc, n, i) => acc + Number(n) * (length + 1 - i), 0);
    const check = (sum * 10) % 11;
    if (Number(value[length]) !== (check === 10 ? 0 : check)) return false;
  }
  return true;
}
function validCnpj(value: string): boolean {
  if (value.length !== 14 || /^(\d)\1{13}$/.test(value)) return false;
  const digitsToCheck = [12, 13];
  for (const length of digitsToCheck) {
    let weight = length === 12 ? 5 : 6;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(value[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    if (Number(value[length]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(input: SupplierData): Prisma.SupplierUpdateInput {
    const output: Record<string, string | null> = {};
    for (const key of FIELDS) {
      const value = input[key];
      if (value === undefined) continue;
      if (value !== null && typeof value !== 'string') throw new BadRequestException(`Campo ${key} inválido.`);
      output[key] = value === null ? null : value.trim() || null;
    }
    if ('name' in output && !output.name) throw new BadRequestException('O nome é obrigatório.');
    if (output.document) {
      const document = digits(output.document);
      if (!validCpf(document) && !validCnpj(document)) throw new BadRequestException('CPF ou CNPJ inválido.');
      output.document = document;
    }
    if (output.zipCode) output.zipCode = digits(output.zipCode);
    if (output.state) output.state = output.state.toUpperCase();
    if (output.email) output.email = output.email.toLowerCase();
    return output;
  }

  private pageParams(pageText?: string, limitText?: string) {
    const page = pageText === undefined ? 1 : Number(pageText);
    const limit = limitText === undefined ? 20 : Number(limitText);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Página deve ser >= 1 e limite entre 1 e 100.');
    }
    return { page, limit, skip: (page - 1) * limit };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('Já existe um fornecedor com esse CPF/CNPJ.');
      if (error.code === 'P2025') throw new NotFoundException('Fornecedor não encontrado.');
      if (error.code === 'P2034') throw new ConflictException('Operação concorrente. Tente novamente.');
    }
    throw error;
  }

  async list(search?: string, status?: string, pageText?: string, limitText?: string) {
    if (status && !['all', 'active', 'inactive'].includes(status)) throw new BadRequestException('Situação inválida.');
    const { page, limit, skip } = this.pageParams(pageText, limitText);
    const term = search?.trim().slice(0, 150);
    const where: Prisma.SupplierWhereInput = {
      ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
      ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { tradeName: { contains: term, mode: 'insensitive' } },
        { document: { contains: digits(term) || term } },
        { city: { contains: term, mode: 'insensitive' } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async options(search?: string) {
    const term = search?.trim().slice(0, 150);
    return this.prisma.supplier.findMany({
      where: { active: true, ...(term ? { OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { tradeName: { contains: term, mode: 'insensitive' } },
        { document: { contains: digits(term) || term } },
      ] } : {}) },
      select: { id: true, name: true, tradeName: true, document: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async get(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  async create(input: SupplierDto, userId: string, ipAddress?: string) {
    const data = this.normalize(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.create({ data: data as Prisma.SupplierCreateInput });
        await tx.auditLog.create({ data: {
          userId, action: 'SUPPLIER_CREATED', entity: 'Supplier', entityId: supplier.id,
          description: `Fornecedor cadastrado: ${supplier.name}.`, ipAddress,
        } });
        return supplier;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { this.handlePrismaError(error); }
  }

  async update(id: string, input: UpdateSupplierDto, userId: string, ipAddress?: string) {
    const data = this.normalize(input);
    if (Object.keys(data).length === 0) throw new BadRequestException('Informe ao menos um campo para atualizar.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.supplier.findUnique({ where: { id } });
        if (!before) throw new NotFoundException('Fornecedor não encontrado.');
        const supplier = await tx.supplier.update({ where: { id }, data });
        await tx.auditLog.create({ data: {
          userId, action: 'SUPPLIER_UPDATED', entity: 'Supplier', entityId: id,
          description: `Fornecedor atualizado: ${before.name} → ${supplier.name}. Campos: ${Object.keys(data).join(', ')}.`, ipAddress,
        } });
        return supplier;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { this.handlePrismaError(error); }
  }

  async status(id: string, active: boolean, userId: string, ipAddress?: string) {
    if (typeof active !== 'boolean') throw new BadRequestException('Situação inválida.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.supplier.findUnique({ where: { id } });
        if (!before) throw new NotFoundException('Fornecedor não encontrado.');
        if (before.active === active) return before;
        const supplier = await tx.supplier.update({ where: { id }, data: { active } });
        await tx.auditLog.create({ data: {
          userId, action: active ? 'SUPPLIER_ACTIVATED' : 'SUPPLIER_DEACTIVATED',
          entity: 'Supplier', entityId: id,
          description: `Fornecedor ${active ? 'ativado' : 'desativado'}: ${supplier.name}.`, ipAddress,
        } });
        return supplier;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { this.handlePrismaError(error); }
  }
}
