
import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '../generated/prisma/client';

import {
  ProductUnit,
  ProductSaleType,
} from '../generated/prisma/enums';

import type {
  AuthenticatedUser,
} from '../auth/auth.types';

import { ProductDto } from './dto/product.dto';

import {
  ProductFilterDto,
} from './dto/product-filter.dto';

const PRODUCT_SELECT = {
  id: true,
  code: true,
  barcode: true,
  name: true,
  description: true,

  categoryId: true,
  brandId: true,

  unit: true,
  saleType: true,

  costPrice: true,
  salePrice: true,

  controlStock: true,
  currentStock: true,
  minStock: true,
  maxStock: true,

  location: true,
  observations: true,
  imagePath: true,

  active: true,
  createdAt: true,
  updatedAt: true,

  category: {
    select: {
      id: true,
      name: true,
      active: true,
    },
  },

  brand: {
    select: {
      id: true,
      name: true,
      active: true,
    },
  },
} as const;

type ProductRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SELECT;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // FUNCOES AUXILIARES
  // ==========================================

  private hasPermission(
    user: AuthenticatedUser,
    permission: string,
  ) {
    return user.permissions.includes(permission);
  }

  private normalizeText(
    value?: string | null,
  ): string | null {
    return value?.trim() || null;
  }

  private requirePermission(
    user: AuthenticatedUser,
    permission: string,
  ) {
    if (!this.hasPermission(user, permission)) {
      throw new ForbiddenException(
        'Você não possui permissão para realizar esta operação.',
      );
    }
  }

  private validatePricePermissions(
    dto: ProductDto,
    user: AuthenticatedUser,
  ) {
    if (dto.costPrice !== undefined) {
      this.requirePermission(
        user,
        'products.cost',
      );
    }

    if (dto.salePrice !== undefined) {
      this.requirePermission(
        user,
        'products.price',
      );
    }
  }

  // ==========================================
  // FORMATAR RESPOSTA
  // ==========================================

  private formatProduct(
    product: ProductRecord,
    user: AuthenticatedUser,
  ) {
    const {
      costPrice,
      salePrice,
      currentStock,
      minStock,
      maxStock,
      ...data
    } = product;

    const response = {
      ...data,

      formattedCode: String(
        product.code,
      ).padStart(6, '0'),

      salePrice: salePrice.toFixed(2),

      currentStock: currentStock.toFixed(3),
      minStock: minStock.toFixed(3),

      maxStock:
        maxStock?.toFixed(3) ?? null,

      lowStock:
        product.active &&
        product.controlStock &&
        currentStock.lte(minStock),

      outOfStock:
        product.controlStock &&
        currentStock.lte(0),
    };

    // Nunca enviar o custo ou a margem
    // para usuários sem permissão.

    if (!this.hasPermission(user, 'products.cost')) {
      return response;
    }

    const grossProfit =
      salePrice.minus(costPrice);

    const margin =
      salePrice.gt(0)
        ? grossProfit
            .div(salePrice)
            .mul(100)
            .toFixed(2)
        : null;

    const markup =
      costPrice.gt(0)
        ? grossProfit
            .div(costPrice)
            .mul(100)
            .toFixed(2)
        : null;

    return {
      ...response,

      costPrice: costPrice.toFixed(4),
      grossProfit: grossProfit.toFixed(4),
      margin,
      markup,
    };
  }

  // ==========================================
  // TRATAMENTO DE ERROS
  // ==========================================

  private handleError(error: unknown): never {
    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Já existe um produto com esse código de barras ou código interno.',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Produto não encontrado.',
        );
      }

      if (error.code === 'P2034') {
        throw new ConflictException(
          'O cadastro foi alterado simultaneamente. Tente novamente.',
        );
      }

      if (error.code === 'P2003') {
        throw new ConflictException(
          'Categoria ou marca inválida.',
        );
      }
    }

    throw error;
  }

  // ==========================================
  // VALIDAR CATEGORIA E MARCA
  // ==========================================

  private async validateRelations(
    tx: Prisma.TransactionClient,
    categoryId: string,
    brandId: string | null,
  ) {
    const category =
      await tx.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category || !category.active) {
      throw new BadRequestException(
        'Selecione uma categoria ativa.',
      );
    }

    if (brandId) {
      const brand =
        await tx.brand.findUnique({
          where: {
            id: brandId,
          },
        });

      if (!brand || !brand.active) {
        throw new BadRequestException(
          'Selecione uma marca ativa.',
        );
      }
    }
  }

  // ==========================================
  // VALIDAR COMERCIALIZACAO
  // ==========================================

  private validateProductRules(data: {
    unit: ProductUnit;
    saleType: ProductSaleType;
    salePrice: Prisma.Decimal;
    costPrice: Prisma.Decimal;
    minStock: Prisma.Decimal;
    maxStock: Prisma.Decimal | null;
  }) {
    const {
      unit,
      saleType,
      salePrice,
      costPrice,
      minStock,
      maxStock,
    } = data;

    if (
      saleType === ProductSaleType.UNIT &&
      unit !== ProductUnit.UN
    ) {
      throw new BadRequestException(
        'Produtos vendidos por unidade devem utilizar UN.',
      );
    }

    if (
      saleType === ProductSaleType.WEIGHT &&
      unit !== ProductUnit.KG
    ) {
      throw new BadRequestException(
        'Produtos vendidos por peso devem utilizar KG.',
      );
    }

    if (salePrice.lte(0)) {
      throw new BadRequestException(
        'O preço de venda deve ser maior que zero.',
      );
    }

    if (costPrice.lt(0)) {
      throw new BadRequestException(
        'O preço de custo não pode ser negativo.',
      );
    }

    if (minStock.lt(0)) {
      throw new BadRequestException(
        'O estoque mínimo não pode ser negativo.',
      );
    }

    if (
      maxStock !== null &&
      maxStock.lt(minStock)
    ) {
      throw new BadRequestException(
        'O estoque máximo não pode ser menor que o mínimo.',
      );
    }

    if (saleType === ProductSaleType.UNIT) {
      if (
        !minStock.isInteger() ||
        (
          maxStock !== null &&
          !maxStock.isInteger()
        )
      ) {
        throw new BadRequestException(
          'Produtos vendidos por unidade devem utilizar quantidades inteiras.',
        );
      }
    }
  }

  // ==========================================
  // CONSULTAR PRODUTOS
  // ==========================================

  async findAll(
    filters: ProductFilterDto,
    user: AuthenticatedUser,
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const search = filters.search?.trim();

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      const searchFilters:
        Prisma.ProductWhereInput[] = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            barcode: {
              contains: search,
            },
          },
          {
            category: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            brand: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ];

      if (/^\d+$/.test(search)) {
        const numericCode = Number(search);

        if (
          Number.isInteger(numericCode) &&
          numericCode > 0 &&
          numericCode <= 2147483647
        ) {
          searchFilters.push({
            code: numericCode,
          });
        }
      }

      where.OR = searchFilters;
    }

    if (filters.status === 'active') {
      where.active = true;
    }

    if (filters.status === 'inactive') {
      where.active = false;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters.saleType) {
      where.saleType = filters.saleType;
    }

    const [records, total] =
      await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,

          select: PRODUCT_SELECT,

          orderBy: [
            { name: 'asc' },
            { code: 'asc' },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.product.count({
          where,
        }),
      ]);

    return {
      data: records.map((product) =>
        this.formatProduct(product, user),
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // CONSULTAR PRODUTO POR ID
  // ==========================================

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: { id },

        select: PRODUCT_SELECT,
      });

    if (!product) {
      throw new NotFoundException(
        'Produto não encontrado.',
      );
    }

    return this.formatProduct(
      product,
      user,
    );
  }

  // ==========================================
  // CONSULTAR CODIGO DE BARRAS
  // ==========================================

  async findByBarcode(
    barcode: string,
    user: AuthenticatedUser,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          barcode: barcode.trim(),
        },

        select: PRODUCT_SELECT,
      });

    if (!product) {
      throw new NotFoundException(
        'Nenhum produto encontrado com esse código de barras.',
      );
    }

    return this.formatProduct(
      product,
      user,
    );
  }

  // ==========================================
  // OPCOES PARA O FORMULARIO
  // ==========================================

  async findOptions() {
    const [categories, brands] =
      await this.prisma.$transaction([
        this.prisma.category.findMany({
          where: {
            active: true,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            name: 'asc',
          },
        }),

        this.prisma.brand.findMany({
          where: {
            active: true,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            name: 'asc',
          },
        }),
      ]);

    return {
      categories,
      brands,

      units: [
        {
          value: 'UN',
          label: 'Unidade',
        },
        {
          value: 'KG',
          label: 'Quilograma',
        },
      ],

      saleTypes: [
        {
          value: 'UNIT',
          label: 'Venda por unidade',
        },
        {
          value: 'WEIGHT',
          label: 'Venda por peso',
        },
      ],
    };
  }

  // ==========================================
  // INDICADORES
  // ==========================================

  async getStats() {
    const [
      total,
      active,
      inactive,
      weightProducts,
      lowStock,
    ] = await this.prisma.$transaction([
      this.prisma.product.count(),

      this.prisma.product.count({
        where: {
          active: true,
        },
      }),

      this.prisma.product.count({
        where: {
          active: false,
        },
      }),

      this.prisma.product.count({
        where: {
          active: true,
          saleType: ProductSaleType.WEIGHT,
        },
      }),

      this.prisma.product.count({
        where: {
          active: true,
          controlStock: true,

          currentStock: {
            lte: this.prisma.product.fields.minStock,
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      weightProducts,
      lowStock,
    };
  }

  // ==========================================
  // CADASTRAR PRODUTO
  // ==========================================

  async create(
    dto: ProductDto,
    user: AuthenticatedUser,
    ipAddress?: string,
  ) {
    this.validatePricePermissions(
      dto,
      user,
    );

    const name =
      dto.name?.trim().replace(/\s+/g, ' ');

    if (!name || name.length < 2) {
      throw new BadRequestException(
        'Informe o nome do produto.',
      );
    }

    const categoryId = dto.categoryId;

    if (!categoryId) {
      throw new BadRequestException(
        'Informe a categoria do produto.',
      );
    }

    if (dto.salePrice === undefined) {
      throw new BadRequestException(
        'Informe o preço de venda.',
      );
    }

    const brandId = dto.brandId ?? null;

    const unit =
      dto.unit ?? ProductUnit.UN;

    const saleType =
      dto.saleType ?? ProductSaleType.UNIT;

    const costPrice = new Prisma.Decimal(
      dto.costPrice ?? '0',
    );

    const salePrice = new Prisma.Decimal(
      dto.salePrice,
    );

    const minStock = new Prisma.Decimal(
      dto.minStock ?? '0',
    );

    const maxStock =
      dto.maxStock != null
        ? new Prisma.Decimal(dto.maxStock)
        : null;

    this.validateProductRules({
      unit,
      saleType,
      costPrice,
      salePrice,
      minStock,
      maxStock,
    });

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.validateRelations(
            tx,
            categoryId,
            brandId,
          );

          const product =
            await tx.product.create({
              data: {
                name,

                description:
                  this.normalizeText(dto.description),

                barcode:
                  this.normalizeText(dto.barcode),

                categoryId,
                brandId,

                unit,
                saleType,

                costPrice,
                salePrice,

                controlStock:
                  dto.controlStock ?? true,

                currentStock:
                  new Prisma.Decimal(0),

                minStock,
                maxStock,

                location:
                  this.normalizeText(dto.location),

                observations:
                  this.normalizeText(dto.observations),

                active: true,
              },

              select: PRODUCT_SELECT,
            });

          await tx.auditLog.create({
            data: {
              userId: user.id,

              action: 'PRODUCT_CREATED',

              description:
                `Produto "${product.name}" cadastrado. Código ${product.code}.`,

              entity: 'Product',
              entityId: product.id,
              ipAddress,
            },
          });

          return this.formatProduct(
            product,
            user,
          );
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

  // ==========================================
  // EDITAR PRODUTO
  // ==========================================

  async update(
    id: string,
    dto: ProductDto,
    user: AuthenticatedUser,
    ipAddress?: string,
  ) {
    this.validatePricePermissions(
      dto,
      user,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const current =
            await tx.product.findUnique({
              where: { id },
            });

          if (!current) {
            throw new NotFoundException(
              'Produto não encontrado.',
            );
          }

          const name =
            dto.name !== undefined
              ? dto.name.trim().replace(/\s+/g, ' ')
              : current.name;

          if (name.length < 2) {
            throw new BadRequestException(
              'Informe um nome válido.',
            );
          }

          const categoryId =
            dto.categoryId ?? current.categoryId;

          const brandId =
            dto.brandId !== undefined
              ? dto.brandId
              : current.brandId;

          const unit =
            dto.unit ?? current.unit;

          const saleType =
            dto.saleType ?? current.saleType;

          // A unidade de comercialização será
          // preservada após o cadastro.

          if (
            unit !== current.unit ||
            saleType !== current.saleType
          ) {
            throw new BadRequestException(
              'Não é permitido alterar a unidade ou o tipo de comercialização após o cadastro.',
            );
          }

          const controlStock =
            dto.controlStock ??
            current.controlStock;

          if (
            controlStock !== current.controlStock &&
            !current.currentStock.isZero()
          ) {
            throw new ConflictException(
              'Não é possível alterar o controle de estoque com saldo existente.',
            );
          }

          const costPrice =
            dto.costPrice !== undefined
              ? new Prisma.Decimal(dto.costPrice)
              : current.costPrice;

          const salePrice =
            dto.salePrice !== undefined
              ? new Prisma.Decimal(dto.salePrice)
              : current.salePrice;

          const minStock =
            dto.minStock !== undefined
              ? new Prisma.Decimal(dto.minStock)
              : current.minStock;

          const maxStock =
            dto.maxStock !== undefined
              ? dto.maxStock === null
                ? null
                : new Prisma.Decimal(dto.maxStock)
              : current.maxStock;

          this.validateProductRules({
            unit,
            saleType,
            costPrice,
            salePrice,
            minStock,
            maxStock,
          });

          if (
            current.active ||
            categoryId !== current.categoryId ||
            brandId !== current.brandId
          ) {
            await this.validateRelations(
              tx,
              categoryId,
              brandId,
            );
          }

          const updated =
            await tx.product.update({
              where: { id },

              data: {
                name,

                barcode:
                  dto.barcode !== undefined
                    ? this.normalizeText(dto.barcode)
                    : current.barcode,

                description:
                  dto.description !== undefined
                    ? this.normalizeText(dto.description)
                    : current.description,

                categoryId,
                brandId,

                costPrice,
                salePrice,

                controlStock,
                minStock,
                maxStock,

                location:
                  dto.location !== undefined
                    ? this.normalizeText(dto.location)
                    : current.location,

                observations:
                  dto.observations !== undefined
                    ? this.normalizeText(dto.observations)
                    : current.observations,
              },

              select: PRODUCT_SELECT,
            });

          const priceChanged =
            !current.salePrice.eq(salePrice) ||
            !current.costPrice.eq(costPrice);

          await tx.auditLog.create({
            data: {
              userId: user.id,

              action: 'PRODUCT_UPDATED',

              description:
                `Produto "${updated.name}" atualizado.${priceChanged ? ' Valores comerciais alterados.' : ''}`,

              entity: 'Product',
              entityId: updated.id,
              ipAddress,
            },
          });

          return this.formatProduct(
            updated,
            user,
          );
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

  // ==========================================
  // ATIVAR E DESATIVAR PRODUTO
  // ==========================================

  async updateStatus(
    id: string,
    active: boolean,
    user: AuthenticatedUser,
    ipAddress?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const current =
            await tx.product.findUnique({
              where: { id },

              select: PRODUCT_SELECT,
            });

          if (!current) {
            throw new NotFoundException(
              'Produto não encontrado.',
            );
          }

          if (current.active === active) {
            return this.formatProduct(
              current,
              user,
            );
          }

          if (active) {
            await this.validateRelations(
              tx,
              current.categoryId,
              current.brandId,
            );
          }

          const updated =
            await tx.product.update({
              where: { id },

              data: {
                active,
              },

              select: PRODUCT_SELECT,
            });

          await tx.auditLog.create({
            data: {
              userId: user.id,

              action: active
                ? 'PRODUCT_ACTIVATED'
                : 'PRODUCT_DEACTIVATED',

              description:
                `Produto "${updated.name}" ${active ? 'ativado' : 'desativado'}.`,

              entity: 'Product',
              entityId: updated.id,
              ipAddress,
            },
          });

          return this.formatProduct(
            updated,
            user,
          );
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
