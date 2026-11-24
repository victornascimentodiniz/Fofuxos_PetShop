
import api from './api'

import type {
  Product,
  ProductInput,
  ProductFilters,
  ProductListResponse,
  ProductStats,
  ProductOptions,
} from '../types/product'

export const productsService = {
  async findAll(
    filters?: ProductFilters,
  ): Promise<ProductListResponse> {
    const response =
      await api.get<ProductListResponse>(
        '/products',
        {
          params: filters,
        },
      )

    return response.data
  },

  async findOne(
    id: string,
  ): Promise<Product> {
    const response = await api.get<Product>(
      `/products/${id}`,
    )

    return response.data
  },

  async findByBarcode(
    barcode: string,
  ): Promise<Product> {
    const response = await api.get<Product>(
      `/products/barcode/${encodeURIComponent(barcode)}`,
    )

    return response.data
  },

  async getStats(): Promise<ProductStats> {
    const response = await api.get<ProductStats>(
      '/products/stats',
    )

    return response.data
  },

  async getOptions(): Promise<ProductOptions> {
    const response =
      await api.get<ProductOptions>(
        '/products/options',
      )

    return response.data
  },

  async create(
    data: ProductInput,
  ): Promise<Product> {
    const response = await api.post<Product>(
      '/products',
      data,
    )

    return response.data
  },

  async update(
    id: string,
    data: ProductInput,
  ): Promise<Product> {
    const response = await api.patch<Product>(
      `/products/${id}`,
      data,
    )

    return response.data
  },

  async updateStatus(
    id: string,
    active: boolean,
  ): Promise<Product> {
    const response = await api.patch<Product>(
      `/products/${id}/status`,
      { active },
    )

    return response.data
  },
}
