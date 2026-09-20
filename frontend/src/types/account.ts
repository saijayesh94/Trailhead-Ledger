export interface Account {
  id: string
  name: string
  bankName: string | null
  type: string
  currency: string
  isDefault: boolean
  isActive: boolean
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
