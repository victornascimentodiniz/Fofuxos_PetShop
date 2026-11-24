import api from './api'
import type { CashDetail, CashSessionRow, DashboardData, Paged, Sale, SalesPage, FinancialSummary } from '../types/reports'

export interface ReportFilters { start?: string; end?: string; terminal?: string; status?: string; operatorId?: string; page?: number; limit?: number }
export const reportsService = {
  async financialSummary(filters: ReportFilters) {
    const { data } = await api.get<FinancialSummary>('/management-reports/financial-summary', { params: filters })
    return data
  },
  async exportCsv(kind: 'sales' | 'cash-sessions', filters: ReportFilters) {
    const { data } = await api.get<Blob>(`/management-reports/export/${kind}.csv`, {
      params: filters,
      responseType: 'blob',
      timeout: 60000,
    })
    return data
  },
  async dashboard(start: string, end: string) {
    const { data } = await api.get<DashboardData>('/management-reports/dashboard', { params: { start, end } })
    return data
  },
  async sessions(filters: ReportFilters) {
    const { data } = await api.get<Paged<CashSessionRow>>('/management-reports/cash-sessions', { params: filters })
    return data
  },
  async session(id: string) {
    const { data } = await api.get<CashDetail>(`/management-reports/cash-sessions/${id}`)
    return data
  },
  async sales(filters: ReportFilters) {
    const { data } = await api.get<SalesPage>('/management-reports/sales', { params: filters })
    return data
  },
  async sale(id: string) {
    const { data } = await api.get<Sale>(`/management-reports/sales/${id}`)
    return data
  },
}
export const brl = (value: string | number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
export const when = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—'
export const paymentLabel = (code: string) => ({ CASH: 'Dinheiro', PIX: 'Pix', DEBIT_CARD: 'Débito', CREDIT_CARD: 'Crédito', OTHER: 'Outro' } as Record<string,string>)[code] ?? code
export const movementLabel = (code: string) => ({ OPENING: 'Abertura', SUPPLY: 'Suprimento', WITHDRAWAL: 'Sangria', CASH_SALE: 'Venda em dinheiro', CASH_REFUND: 'Estorno em dinheiro' } as Record<string,string>)[code] ?? code
// Datas de calendário local convertidas a instantes ISO exatos, sem assumir UTC como fuso do usuário.
export const rangeForDates = (start: string, end: string) => ({ start: new Date(`${start}T00:00:00`).toISOString(), end: new Date(Number(end.slice(0,4)), Number(end.slice(5,7))-1, Number(end.slice(8,10))+1).toISOString() })
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
