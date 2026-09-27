import { api } from "./api"
import type { Transaction, TransactionInput, TransactionUpdate } from "@/types/transaction"

export const transactionsApi = {
  async list(params?: { from?: string; to?: string; ownerId?: string }): Promise<Transaction[]> {
    const { data } = await api.get<{ transactions: Transaction[] }>("/api/transactions", { params })
    return data.transactions
  },
  async create(input: TransactionInput): Promise<Transaction> {
    const { data } = await api.post<{ transaction: Transaction }>("/api/transactions", input)
    return data.transaction
  },
  async update(id: string, input: TransactionUpdate): Promise<Transaction> {
    const { data } = await api.patch<{ transaction: Transaction }>(`/api/transactions/${id}`, input)
    return data.transaction
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/transactions/${id}`)
  },
}
