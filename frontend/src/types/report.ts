export interface StatementLine {
  categoryId: string
  name: string
  type: "income" | "expense"
  amount: string
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
