
export type CatalogType = 'categories' | 'brands'

export type CatalogStatus =
  | 'all'
  | 'active'
  | 'inactive'

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  active: boolean

  productsCount: number

  createdAt: string
  updatedAt: string
}

export interface CatalogInput {
  name: string
  description?: string | null
}

export interface CatalogFilters {
  search?: string
  status?: CatalogStatus
}
