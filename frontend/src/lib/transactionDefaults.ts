import type { TransactionType } from "@/types/transaction"

const KEY = "trailhead:lastTransactionDefaults"

interface LastTransactionDefaults {
  accountId?: string
  ownerId?: string
  type?: TransactionType
}

export function getLastTransactionDefaults(): LastTransactionDefaults {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveLastTransactionDefaults(defaults: LastTransactionDefaults): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(defaults))
  } catch {
    // per-viewer convenience only — safe to ignore if storage is unavailable
  }
}
