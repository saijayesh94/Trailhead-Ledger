export interface Account {
  id: string
  name: string
  bankName: string | null
  type: string
  currency: string
  isDefault: boolean
  isActive: boolean
  // Only present on GET /api/accounts (list) — computed from transaction history.
  balance?: string
}

export interface AccountInput {
  name: string
  bankName?: string
  type: string
  currency?: string
}

export interface AccountUpdate {
  name?: string
  bankName?: string
  type?: string
  currency?: string
  isActive?: boolean
}
