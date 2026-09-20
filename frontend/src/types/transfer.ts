export interface Transfer {
  id: string
  amount: string
  fromAccountId: string
  toAccountId: string
  ownerId: string
  description: string | null
  date: string
  fromAccount: { id: string; name: string; currency: string }
  toAccount: { id: string; name: string; currency: string }
  owner: { id: string; name: string; color: string | null }
}

export interface TransferInput {
  amount: number
  fromAccountId: string
  toAccountId: string
  ownerId: string
  description?: string
  date: string
}
