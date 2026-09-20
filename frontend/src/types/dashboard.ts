export interface DashboardOwner {
  id: string
  name: string
  color: string | null
  balance: string
}

export interface DashboardAccount {
  id: string
  name: string
  currency: string
  balance: string
}

export interface DashboardCategorySpend {
  categoryId: string
  name: string
  amount: string
}

export interface Dashboard {
  currency: string
  totalBalance: string
  owners: DashboardOwner[]
  accounts: DashboardAccount[]
  thisMonth: {
    income: string
    expenses: string
    net: string
  }
  spendingByCategory: DashboardCategorySpend[]
}
