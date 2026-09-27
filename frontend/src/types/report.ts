export interface StatementLine {
  categoryId: string
  name: string
  type: "income" | "expense"
  amount: string
}

// One line of the bank-style transaction statement on the Reports page.
// `balance` is the running ledger balance after this entry; transfers move
// money between the user's own accounts, so they leave it unchanged.
export interface StatementRow {
  id: string
  kind: "credit" | "debit" | "transfer"
  date: string // YYYY-MM-DD
  description: string
  category: string
  categoryId: string | null
  account: string
  accountIds: string[]
  owner: string
  currency: string
  amount: number
  balance: number
}

export interface Statement {
  from: string
  to: string
  openingBalance: string
  closingBalance: string
  totalIncome: string
  totalExpenses: string
  net: string
  lines: StatementLine[]
}
