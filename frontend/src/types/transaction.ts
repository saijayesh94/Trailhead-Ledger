export type TransactionType = "income" | "expense" | "received"

export interface Transaction {
  id: string
  amount: string
  type: TransactionType
  description: string | null
  date: string
  accountId: string
  ownerId: string
  categoryId: string
  account: { id: string; name: string; currency: string }
  owner: { id: string; name: string; color: string | null }
  category: { id: string; name: string; type: "income" | "expense" }
}

export interface TransactionInput {
  amount: number
  type: TransactionType
  description?: string
  date: string
  accountId: string
  ownerId: string
  categoryId: string
}

export type TransactionUpdate = Partial<TransactionInput>
