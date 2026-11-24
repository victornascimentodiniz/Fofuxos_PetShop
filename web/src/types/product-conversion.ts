
import type {
  ProductUnit,
  ProductSaleType,
} from './product'

export interface ConversionProductRelation {
  id: string
  name: string
}

export interface ConversionProduct {
  id: string
  code: number
  formattedCode: string

  name: string
  barcode: string | null

  unit: ProductUnit
  saleType: ProductSaleType

  active: boolean
  controlStock: boolean
  currentStock: string

  category: ConversionProductRelation
  brand: ConversionProductRelation | null
}

export interface ProductConversion {
  id: string

  sourceProductId: string
  destinationProductId: string

  conversionFactor: string
  description: string | null

  active: boolean
  available: boolean

  conversionLabel: string

  sourceProduct: ConversionProduct
  destinationProduct: ConversionProduct

  createdAt: string
  updatedAt: string
}

export interface ProductConversionInput {
  destinationProductId: string

  conversionFactor: string

  description?: string | null
}

export type ConversionStatus =
  | 'all'
  | 'active'
  | 'inactive'
