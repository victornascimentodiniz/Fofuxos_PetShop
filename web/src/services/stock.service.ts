import api from './api'
import type { Fractionation, Paginated, ProductConversion, StockMovement, StockProduct, StockStats } from '../types/stock'

export const stockService = {
  async list(params: { search?: string; page?: number; limit?: number } = {}) {
    const { data } = await api.get<Paginated<StockProduct>>('/stock', { params })
    return data
  },
  async stats() {
    const { data } = await api.get<StockStats>('/stock/stats')
    return data
  },
  async movements(params: { productId?: string; page?: number; limit?: number } = {}) {
    const { data } = await api.get<Paginated<StockMovement>>('/stock/movements', { params })
    return data
  },
  async fractionations(params: { page?: number; limit?: number } = {}) {
    const { data } = await api.get<Paginated<Fractionation>>('/stock/fractionations', { params })
    return data
  },
  async conversion(sourceProductId: string) {
    const { data } = await api.get<ProductConversion | null>(`/product-conversions/source/${sourceProductId}`)
    return data
  },
  async entry(input: { productId: string; quantity: string; reason: string; observations?: string }) {
    const { data } = await api.post('/stock/entry', input)
    return data
  },
  async exit(input: { productId: string; quantity: string; reason: string; observations?: string }) {
    const { data } = await api.post('/stock/exit', input)
    return data
  },
  async adjust(input: { productId: string; newStock: string; reason: string; observations?: string }) {
    const { data } = await api.post('/stock/adjust', input)
    return data
  },
  async fractionate(input: { sourceProductId: string; packages: number; lossQuantity: string; observations?: string }) {
    const { data } = await api.post('/stock/fractionate', input)
    return data
  },
}
