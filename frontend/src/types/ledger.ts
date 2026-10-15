import type { Transaction } from "@/types/transaction"
import type { Transfer } from "@/types/transfer"

// One row of the Transactions page: transactions and transfers share a list
export type LedgerEntry = { kind: "transaction"; data: Transaction } | { kind: "transfer"; data: Transfer }

export interface LedgerPage {
  entries: LedgerEntry[]
  // Transactions + transfers across all pages
  total: number
  page: number
  pageSize: number
}
