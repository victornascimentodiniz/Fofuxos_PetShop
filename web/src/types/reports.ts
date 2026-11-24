export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface Paged<T> { data: T[]; pagination: Pagination }
export interface Person { id: string; name: string }
export interface Payment { id: string; method: string; amount: string; receivedAmount: string | null; changeAmount: string; reference: string | null }
export interface SaleItem { id: string; productId: string; productName: string; unit: string; quantity: string; unitPrice: string; totalAmount: string }
export interface Sale {
  id: string; number: number; status: 'COMPLETED' | 'CANCELLED'; createdAt: string;
  subtotal: string; discountAmount: string; totalAmount: string; notes: string | null;
  operator: Person; cashSession: { id: string; terminalCode: string; openedAt: string };
  items: SaleItem[]; payments: Payment[];
}
export interface CashSessionRow {
  id: string; terminalCode: string; status: 'OPEN'|'CLOSED'; openedAt: string; closedAt: string | null;
  openedBy: Person; closedBy: Person | null; openingAmount: string; closingDeclaredAmount: string | null; salesCount: number;
}
export interface CashSettlement {
  openingAmount: string; expectedCash: string; declaredCash: string | null; difference: string | null;
  supplies: string; withdrawals: string; cashSales: string; cashRefunds: string;
  salesCount: number; salesTotal: string; discounts: string;
  payments: { method: string; amount: string; count: number }[];
}
export interface CashDetail extends Omit<CashSessionRow, 'salesCount'> {
  notes: string | null; settlement: CashSettlement; sales: Sale[];
  movements: { id: string; type: string; amount: string; reason: string; notes: string|null; createdAt: string; user: Person; saleId: string|null }[];
}
export interface SalesPage extends Paged<Sale> { completedCount: number; completedTotal: string }
export interface DashboardData {
  period: { start: string; end: string; timezone: string };
  revenue: string; discounts: string; totalSales: number; openCashSessions: number; closedCashSessions: number;
  payments: { method: string; amount: string }[];
  recentSales: Sale[];
  lowStock: { id: string; name: string; unit: string; currentStock: string; minStock: string }[];
  daily: { day: string; total: string; count: number }[];
}

export interface FinancialSummary {
  period: { gte: string; lt: string }; salesCount: number; revenue: string; subtotal: string;
  discounts: string; averageTicket: string;
  payments: { method: string; amount: string; count: number }[];
  operators: { id: string; name: string; count: number; total: string }[];
  topProducts: { name: string; unit: string; quantity: string; total: string }[];
}
