
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '../generated/prisma/client';

import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

export type CatalogType = 'category' | 'brand';

const CATALOG_SELECT = {
  id: true,
  name: true,
  description: true,
  active: true,
  createdAt: true,
  updatedAt: true,

  _count: {
    select: {
      products: true,
    },
  },
} as const;

type CatalogRecord = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    products: number;
  };
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ========================================
  // FUNCOES AUXILIARES
  // ========================================

  private getLabel(type: CatalogType) {
    return type === 'category'
      ? 'Categoria'
      : 'Marca';
  }

  private getEntity(type: CatalogType) {
    return type === 'category'
      ? 'Category'
      : 'Brand';
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private formatRecord(record: CatalogRecord) {
    const { _count, ...data } = record;

    return {
      ...data,
      productsCount: _count.products,
    };
  }

  private handleError(error: unknown): never {
    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Já existe um cadastro com esse nome.',
        );
      }

      if (error.code === 'P2034') {
        throw new ConflictException(
          'O cadastro foi alterado simultaneamente. Tente novamente.',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Cadastro não encontrado.',
        );
      }
    }

    throw error;
  }

  // ========================================
  // LISTAGEM
  // ========================================

  async findAll(
    type: CatalogType,
    search?: string,
    status?: string,
  ) {
    const term = search?.trim();

    if (
      status &&
      !['all', 'active', 'inactive'].includes(status)
    ) {
      throw new BadRequestException(
        'Filtro de situação inválido.',
      );
    }

    const where = {
      ...(term
        ? {
            OR: [
              {
                name: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),

      ...(status === 'active'
        ? { active: true }
        : {}),

      ...(status === 'inactive'
        ? { active: false }
        : {}),
    };

    const records =
      type === 'category'
        ? await this.prisma.category.findMany({
            where,
            select: CATALOG_SELECT,
            orderBy: {
              name: 'asc',
            },
          })
        : await this.prisma.brand.findMany({
            where,
            select: CATALOG_SELECT,
            orderBy: {
              name: 'asc',
            },
          });

    return records.map((record) =>
      this.formatRecord(record),
    );
  }

  // ========================================
  // CONSULTAR POR ID
  // ========================================

  async findOne(
    type: CatalogType,
    id: string,
  ) {
    const record =
      type === 'category'
        ? await this.prisma.category.findUnique({
            where: { id },
            select: CATALOG_SELECT,
          })
        : await this.prisma.brand.findUnique({
            where: { id },
            select: CATALOG_SELECT,
          });

    if (!record) {
      throw new NotFoundException(
        `${this.getLabel(type)} não encontrada.`,
      );
    }

    return this.formatRecord(record);
  }

  // ========================================
  // CADASTRAR
  // ========================================

  async create(
    type: CatalogType,
    dto: CreateCatalogDto,
    userId: string,
    ipAddress?: string,
  ) {
    const name = this.normalizeName(dto.name);

    if (name.length < 2) {
      throw new BadRequestException(
        'Informe um nome válido.',
      );
    }

    const description =
      dto.description?.trim() || null;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const duplicateFilter = {
            name: {
              equals: name,
              mode: 'insensitive' as const,
            },
          };

          const existing =
            type === 'category'
              ? await tx.category.findFirst({
                  where: duplicateFilter,
                })
              : await tx.brand.findFirst({
                  where: duplicateFilter,
                });

          if (existing) {
            throw new ConflictException(
              `${this.getLabel(type)} já cadastrada com esse nome.`,
            );
          }

          const data = {
            name,
            description,
            active: true,
          };

          const record =
            type === 'category'
              ? await tx.category.create({
                  data,
                  select: CATALOG_SELECT,
                })
              : await tx.brand.create({
                  data,
                  select: CATALOG_SELECT,
                });

          await tx.auditLog.create({
            data: {
              userId,
              action:
                type === 'category'
                  ? 'CATEGORY_CREATED'
                  : 'BRAND_CREATED',

              description:
                `${this.getLabel(type)} "${name}" cadastrada.`,

              entity: this.getEntity(type),
              entityId: record.id,
              ipAddress,
            },
          });

          return this.formatRecord(record);
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  // ========================================
  // EDITAR CADASTRO
  // ========================================

  async update(
    type: CatalogType,
    id: string,
    dto: UpdateCatalogDto,
    userId: string,
    ipAddress?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const current =
            type === 'category'
              ? await tx.category.findUnique({
                  where: { id },
                })
              : await tx.brand.findUnique({
                  where: { id },
                });

          if (!current) {
            throw new NotFoundException(
              `${this.getLabel(type)} não encontrada.`,
            );
          }

          const name =
            dto.name !== undefined
              ? this.normalizeName(dto.name)
              : current.name;

          if (name.length < 2) {
            throw new BadRequestException(
              'Informe um nome válido.',
            );
          }

          const duplicateFilter = {
            id: {
              not: id,
            },
            name: {
              equals: name,
              mode: 'insensitive' as const,
            },
          };

          const duplicate =
            type === 'category'
              ? await tx.category.findFirst({
                  where: duplicateFilter,
                })
              : await tx.brand.findFirst({
                  where: duplicateFilter,
                });

          if (duplicate) {
            throw new ConflictException(
              'Já existe outro cadastro com esse nome.',
            );
          }

          const description =
            dto.description !== undefined
              ? dto.description?.trim() || null
              : current.description;

          const data = {
            name,
            description,
          };

          const updated =
            type === 'category'
              ? await tx.category.update({
                  where: { id },
                  data,
                  select: CATALOG_SELECT,
                })
              : await tx.brand.update({
                  where: { id },
                  data,
                  select: CATALOG_SELECT,
                });

          await tx.auditLog.create({
            data: {
              userId,
              action:
                type === 'category'
                  ? 'CATEGORY_UPDATED'
                  : 'BRAND_UPDATED',

              description:
                `${this.getLabel(type)} "${current.name}" atualizada para "${name}".`,

              entity: this.getEntity(type),
              entityId: id,
              ipAddress,
            },
          });

          return this.formatRecord(updated);
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  // ========================================
  // ATIVAR OU DESATIVAR
  // ========================================

  async updateStatus(
    type: CatalogType,
    id: string,
    active: boolean,
    userId: string,
    ipAddress?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const current =
            type === 'category'
              ? await tx.category.findUnique({
                  where: { id },
                  select: CATALOG_SELECT,
                })
              : await tx.brand.findUnique({
                  where: { id },
                  select: CATALOG_SELECT,
                });

          if (!current) {
            throw new NotFoundException(
              `${this.getLabel(type)} não encontrada.`,
            );
          }

          if (current.active === active) {
            return this.formatRecord(current);
          }

          if (!active) {
            const activeProducts =
              await tx.product.count({
                where: {
                  active: true,

                  ...(type === 'category'
                    ? { categoryId: id }
                    : { brandId: id }),
                },
              });

            if (activeProducts > 0) {
              throw new ConflictException(
                `Não é possível desativar. Existem ${activeProducts} produtos ativos vinculados.`,
              );
            }
          }

          const updated =
            type === 'category'
              ? await tx.category.update({
                  where: { id },
                  data: { active },
                  select: CATALOG_SELECT,
                })
              : await tx.brand.update({
                  where: { id },
                  data: { active },
                  select: CATALOG_SELECT,
                });

          const prefix =
            type === 'category'
              ? 'CATEGORY'
              : 'BRAND';

          await tx.auditLog.create({
            data: {
              userId,
              action:
                `${prefix}_${active ? 'ACTIVATED' : 'DEACTIVATED'}`,

              description:
                `${this.getLabel(type)} "${current.name}" ${active ? 'ativada' : 'desativada'}.`,

              entity: this.getEntity(type),
              entityId: id,
              ipAddress,
            },
          });

          return this.formatRecord(updated);
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
