
import api from './api'

import type {
  ProductConversion,
  ProductConversionInput,
  ConversionProduct,
  ConversionStatus,
} from '../types/product-conversion'

const BASE_PATH = '/product-conversions'

export const productConversionsService = {
  // LISTAR CONVERSOES

  async findAll(
    status: ConversionStatus = 'all',
  ): Promise<ProductConversion[]> {
    const response =
      await api.get<ProductConversion[]>(
        BASE_PATH,
        {
          params: { status },
        },
      )

    return response.data
  },

  // CONSULTAR CONVERSAO DA EMBALAGEM

  async findBySource(
    sourceProductId: string,
  ): Promise<ProductConversion | null> {
    const response =
      await api.get<ProductConversion | null>(
        `${BASE_PATH}/source/${sourceProductId}`,
      )

    return response.data || null
  },

  // CONSULTAR EMBALAGENS DE UM DESTINO

  async findByDestination(
    destinationProductId: string,
  ): Promise<ProductConversion[]> {
    const response =
      await api.get<ProductConversion[]>(
        `${BASE_PATH}/destination/${destinationProductId}`,
      )

    return response.data
  },

  // PESQUISAR PRODUTOS PARA VINCULACAO

  async findOptions(
    sourceProductId: string,
    search?: string,
  ): Promise<ConversionProduct[]> {
    const response =
      await api.get<ConversionProduct[]>(
        `${BASE_PATH}/options/${sourceProductId}`,
        {
          params: {
            search: search || undefined,
          },
        },
      )

    return response.data
  },

  // CRIAR OU ATUALIZAR CONVERSAO

  async save(
    sourceProductId: string,
    data: ProductConversionInput,
  ): Promise<ProductConversion> {
    const response =
      await api.put<ProductConversion>(
        `${BASE_PATH}/source/${sourceProductId}`,
        data,
      )

    return response.data
  },

  // ATIVAR OU DESATIVAR

  async updateStatus(
    sourceProductId: string,
    active: boolean,
  ): Promise<ProductConversion> {
    const response =
      await api.patch<ProductConversion>(
        `${BASE_PATH}/source/${sourceProductId}/status`,
        { active },
      )

    return response.data
  },
}
