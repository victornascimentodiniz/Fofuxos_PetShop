
import api from './api'

import type {
  CatalogType,
  CatalogItem,
  CatalogInput,
  CatalogFilters,
} from '../types/catalog'

export const catalogService = {
  async findAll(
    type: CatalogType,
    filters?: CatalogFilters,
  ): Promise<CatalogItem[]> {
    const response = await api.get<CatalogItem[]>(
      `/${type}`,
      {
        params: filters,
      },
    )

    return response.data
  },

  async findOne(
    type: CatalogType,
    id: string,
  ): Promise<CatalogItem> {
    const response = await api.get<CatalogItem>(
      `/${type}/${id}`,
    )

    return response.data
  },

  async create(
    type: CatalogType,
    data: CatalogInput,
  ): Promise<CatalogItem> {
    const response = await api.post<CatalogItem>(
      `/${type}`,
      data,
    )

    return response.data
  },

  async update(
    type: CatalogType,
    id: string,
    data: CatalogInput,
  ): Promise<CatalogItem> {
    const response = await api.patch<CatalogItem>(
      `/${type}/${id}`,
      data,
    )

    return response.data
  },

  async updateStatus(
    type: CatalogType,
    id: string,
    active: boolean,
  ): Promise<CatalogItem> {
    const response = await api.patch<CatalogItem>(
      `/${type}/${id}/status`,
      { active },
    )

    return response.data
  },
}
