import api from './api'

export interface PurchaseProductOption {
  id: string; code: number; name: string; unit: string; currentStock: string; controlStock: boolean; costPrice: string
}
export interface PurchaseSupplierOption { id: string; name: string }
export interface PurchaseOptions { suppliers: PurchaseSupplierOption[]; products: PurchaseProductOption[] }
export interface PurchaseLine {
  id: string; productId: string; quantity: string; receivedQuantity: string; unitCost: string; totalCost: string;
  product: { id: string; code: number; name: string; unit: string }
}
export interface ReceiptLine {
  id: string; quantity: string; unitCost: string; product: { id: string; name: string; unit: string }
}
export interface Receipt {
  id: string; createdAt: string; operationId: string; notes: string | null;
  receivedBy: { name: string }; items: ReceiptLine[]
}
export interface Purchase {
  id: string; number: number; status: string; createdAt: string;
  invoiceNumber: string | null; invoiceSeries: string | null; notes: string | null; totalAmount: string;
  supplier: { id: string; name: string }; createdBy: { name: string }; items: PurchaseLine[]; receipts: Receipt[]
}
export interface PurchaseListRow {
  id: string; number: number; status: string; createdAt: string; totalAmount: string;
  invoiceNumber: string | null; supplier: { name: string }; createdBy: { name: string };
  _count: { items: number; receipts: number }
}
export interface PurchasePage { data: PurchaseListRow[]; pagination: { page: number; total: number; totalPages: number } }

export const purchasesService = {
  async options(search = ''): Promise<PurchaseOptions> {
    const { data } = await api.get<PurchaseOptions>('/purchases/options', { params: { search } }); return data
  },
  async list(page = 1, search = ''): Promise<PurchasePage> {
    const { data } = await api.get<PurchasePage>('/purchases', { params: { page, search } }); return data
  },
  async get(id: string): Promise<Purchase> {
    const { data } = await api.get<Purchase>(`/purchases/${id}`); return data
  },
  async create(input: { supplierId: string; invoiceNumber?: string; invoiceSeries?: string; notes?: string;
    items: { productId: string; quantity: string; unitCost: string }[] }): Promise<Purchase> {
    const { data } = await api.post<Purchase>('/purchases', input); return data
  },
  async receive(id: string, input: { operationId: string; notes?: string; items: { purchaseItemId: string; quantity: string }[] }): Promise<{ duplicated: boolean; receiptId: string; purchase: Purchase }> {
    const { data } = await api.post<{ duplicated: boolean; receiptId: string; purchase: Purchase }>(`/purchases/${id}/receive`, input); return data
  },
}
