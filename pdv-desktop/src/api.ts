export type ApiResponse<T> = { ok: boolean; status: number; data: T }
export type PosLoginOperator = { name: string; username: string }
export type Operator = { id: string; name: string; permissions: string[]; mustChangePassword?: boolean }
export type Product = { id: string; code: number; barcode: string | null; name: string; unit: string; saleType: 'UNIT' | 'WEIGHT'; salePrice: string; currentStock: string; controlStock: boolean }
export type Cash = { id: string; terminalCode: string; status: 'OPEN' | 'CLOSED'; openedById: string; openedBy?: { id: string; name: string }; openingAmount: string; summary?: { expectedCash: string; sales: number; cashSalesAmount: string; supplyAmount: string; withdrawalAmount: string } }
export type Sale = { id: string; number: number; totalAmount: string; createdAt: string; items: { productName: string; quantity: string }[]; payments: { method: string; amount: string }[] }
export type PageData<T> = { data: T[]; pagination: { page: number; total: number; totalPages: number } }

declare global {
  interface Window {
    fofuxos: {
      request: <T>(args: { method: 'GET' | 'POST'; route: string; body?: unknown }) => Promise<ApiResponse<T>>;
      config: () => Promise<{ apiBase: string; version: string }>;
      clearSession: () => Promise<boolean>;
      windowMode: (mode: 'login' | 'pdv') => Promise<boolean>;
      quit: () => Promise<boolean>;
    }
  }
}
function errorMessage(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Erro desconhecido.'
  const message = (value as { message?: string | string[] }).message
  return Array.isArray(message) ? message.join('; ') : message || 'Operação não realizada.'
}
export async function api<T>(method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
  if (!window.fofuxos) throw new Error('Abra pelo aplicativo Electron, não diretamente no navegador.');
  const response = await window.fofuxos.request<T>({ method, route, body });
  if (!response.ok) throw new Error(`${errorMessage(response.data)}${response.status === 0 ? ' Verifique a conexão com o servidor.' : ''}`)
  return response.data
}
export function money(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function decimal(raw: string): string {
  return raw.trim().replace(',', '.');
}
export function validMoney(raw: string, allowZero = true): boolean {
  const n = decimal(raw);
  return /^\d{1,12}(\.\d{1,2})?$/.test(n) && (allowZero ? Number(n) >= 0 : Number(n) > 0);
}
