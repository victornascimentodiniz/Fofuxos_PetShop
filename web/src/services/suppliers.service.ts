import api from './api'
import type { Supplier, SupplierInput, SupplierListResponse, SupplierStatus } from '../types/supplier'

export const suppliersService = {
  async list(params: { search?: string; status?: SupplierStatus; page?: number; limit?: number } = {}): Promise<SupplierListResponse> {
    const { data } = await api.get<SupplierListResponse>('/suppliers', { params })
    return data
  },
  async get(id: string): Promise<Supplier> {
    const { data } = await api.get<Supplier>(`/suppliers/${id}`)
    return data
  },
  async create(input: SupplierInput): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/suppliers', input)
    return data
  },
  async update(id: string, input: SupplierInput): Promise<Supplier> {
    const { data } = await api.patch<Supplier>(`/suppliers/${id}`, input)
    return data
  },
  async updateStatus(id: string, active: boolean): Promise<Supplier> {
    const { data } = await api.patch<Supplier>(`/suppliers/${id}/status`, { active })
    return data
  },
}
