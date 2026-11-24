export type StockUnit = 'UN' | 'KG' | 'G' | 'L' | 'ML'
export type StockMovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'FRACTION_OUT' | 'FRACTION_IN' | 'SALE' | 'PURCHASE'

export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface Paginated<T> { data: T[]; pagination: Pagination }
export interface StockProduct {
  id: string; code: number; formattedCode: string; name: string; barcode: string | null
  unit: StockUnit; saleType: 'UNIT' | 'WEIGHT'; active: boolean; controlStock: boolean
  currentStock: string; minStock: string; maxStock: string | null; lowStock: boolean
  category: { id: string; name: string }; brand: { id: string; name: string } | null
}
export interface StockStats { controlled: number; active: number; withoutStock: number; lowStock: number; movements: number }
export interface StockMovement {
  id: string; productId: string; userId: string; type: StockMovementType
  quantity: string; previousStock: string; newStock: string; reason: string
  observations: string | null; operationId: string | null; createdAt: string
  product: { code: number; name: string; unit: StockUnit }; user: { name: string }
}
export interface Fractionation {
  id: string; packages: number; conversionFactor: string; grossQuantity: string
  lossQuantity: string; netQuantity: string; observations: string | null; createdAt: string
  sourceProduct: { id: string; code: number; name: string; unit: StockUnit }
  destinationProduct: { id: string; code: number; name: string; unit: StockUnit }
  user: { id: string; name: string }
}
export interface ProductConversion {
  id: string; active: boolean; available: boolean; conversionFactor: string
  destinationProduct: { id: string; name: string; unit: StockUnit }
}
export type StockOperation = 'entry' | 'exit' | 'adjust' | 'fractionate'
