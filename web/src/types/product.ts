
export type ProductUnit =
  | 'UN'
  | 'KG'
  | 'G'
  | 'L'
  | 'ML'

export type ProductSaleType =
  | 'UNIT'
  | 'WEIGHT'

export type ProductStatus =
  | 'all'
  | 'active'
  | 'inactive'

export interface ProductRelation {
  id: string
  name: string
  active: boolean
}

export interface Product {
  id: string
  code: number
  formattedCode: string

  barcode: string | null
  name: string
  description: string | null

  categoryId: string
  brandId: string | null

  category: ProductRelation
  brand: ProductRelation | null

  unit: ProductUnit
  saleType: ProductSaleType

  costPrice?: string
  salePrice: string

  grossProfit?: string
  margin?: string | null
  markup?: string | null

  controlStock: boolean

  currentStock: string
  minStock: string
  maxStock: string | null

  lowStock: boolean
  outOfStock: boolean

  location: string | null
  observations: string | null
  imagePath: string | null

  active: boolean

  createdAt: string
  updatedAt: string
}

export interface ProductInput {
  name?: string
  description?: string | null
  barcode?: string | null

  categoryId?: string
  brandId?: string | null

  unit?: ProductUnit
  saleType?: ProductSaleType

  costPrice?: string
  salePrice?: string

  controlStock?: boolean
  minStock?: string
  maxStock?: string | null

  location?: string | null
  observations?: string | null
}

export interface ProductFilters {
  search?: string
  status?: ProductStatus

  categoryId?: string
  brandId?: string

  saleType?: ProductSaleType

  page?: number
  limit?: number
}

export interface ProductPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ProductListResponse {
  data: Product[]
  pagination: ProductPagination
}

export interface ProductStats {
  total: number
  active: number
  inactive: number
  weightProducts: number
  lowStock: number
}

export interface ProductOption {
  id: string
  name: string
}

export interface ProductOptions {
  categories: ProductOption[]
  brands: ProductOption[]

  units: {
    value: ProductUnit
    label: string
  }[]

  saleTypes: {
    value: ProductSaleType
    label: string
  }[]
}
