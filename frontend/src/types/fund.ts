export type PaymentMethod = "cash" | "upi" | "card" | "bank" | "other"
export type FundStatus = "active" | "closed"

// A fund as stored — what PATCH /api/funds/:id returns
export interface FundRecord {
  id: string
  name: string
  description: string | null
  budget: string | null
  startDate: string
  endDate: string | null
  status: FundStatus
  createdAt: string
  updatedAt: string
}

// Computed server-side from the fund's deposits and expenses
export interface FundTotals {
  totalDeposited: string
  totalSpent: string
  remaining: string
  expenseCount: number
}

export type Fund = FundRecord & FundTotals

export interface FundInput {
  name: string
  description?: string
  budget?: number | null
  startDate: string
  endDate?: string | null
}

export interface FundUpdate {
  name?: string
  description?: string | null
  budget?: number | null
  startDate?: string
  endDate?: string | null
  status?: FundStatus
}

export interface FundDeposit {
  id: string
  fundId: string
  amount: string
  date: string
  source: string
  paymentMethod: PaymentMethod
  note: string | null
  createdAt: string
}

export interface FundDepositInput {
  amount: number
  date: string
  source: string
  paymentMethod: PaymentMethod
  note?: string
}

export interface FundExpense {
  id: string
  fundId: string
  amount: string
  date: string
  fundCategoryId: string
  paymentMethod: PaymentMethod
  description: string | null
  createdAt: string
  category: { id: string; name: string }
}

export interface FundExpenseInput {
  amount: number
  date: string
  fundCategoryId: string
  paymentMethod: PaymentMethod
  description?: string
}

// One row of a fund's single list: money received into it or spent from it.
// Stored as deposits and expenses; the fund page shows them together.
export type FundEntry = { kind: "received"; data: FundDeposit } | { kind: "spent"; data: FundExpense }

export interface FundDetail {
  fund: Fund
  deposits: FundDeposit[]
  expenses: FundExpense[]
}

export interface FundCategory {
  id: string
  name: string
  icon: string | null
  isDefault: boolean
  isActive: boolean
}

export interface FundCategoryInput {
  name: string
  icon?: string
}

export interface FundCategoryUpdate {
  name?: string
  icon?: string
  isActive?: boolean
}
