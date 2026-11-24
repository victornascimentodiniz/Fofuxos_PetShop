export interface Supplier {
  id: string
  name: string
  tradeName: string | null
  document: string | null
  stateRegistration: string | null
  email: string | null
  phone: string | null
  contactName: string | null
  zipCode: string | null
  street: string | null
  addressNumber: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  observations: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierFields = Pick<Supplier,
  | 'name' | 'tradeName' | 'document' | 'stateRegistration'
  | 'email' | 'phone' | 'contactName' | 'zipCode' | 'street'
  | 'addressNumber' | 'complement' | 'neighborhood' | 'city'
  | 'state' | 'observations'
>
export type SupplierInput = SupplierFields
export type SupplierStatus = 'all' | 'active' | 'inactive'
export interface SupplierPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}
export interface SupplierListResponse {
  data: Supplier[]
  pagination: SupplierPagination
}
