import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchDashboard } from "@/services/dashboard"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import type { Dashboard as DashboardData } from "@/types/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Could not load dashboard")))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return null

  if (data.accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">
            Add an account and record your first transaction to see your dashboard come to life.
          </p>
          <Button asChild>
            <Link to="/settings">Get started</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const net = Number(data.thisMonth.net)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal">Total Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-3xl sm:text-4xl font-semibold break-words">
            {formatCurrency(data.totalBalance, data.currency)}
          </p>
          <div className="flex flex-col gap-1.5 border-t pt-4">
            {data.owners.map((owner) => (
              <div key={owner.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: owner.color ?? "#999" }}
                  />
                  <span className="truncate">{owner.name}'s Money</span>
                </div>
                <span className="font-medium shrink-0">{formatCurrency(owner.balance, data.currency)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{account.name}</span>
                <span className="font-medium shrink-0">{formatCurrency(account.balance, account.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Income</span>
              <span className="font-medium text-green-600">
                {formatCurrency(data.thisMonth.income, data.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-medium text-red-600">
                {formatCurrency(data.thisMonth.expenses, data.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(data.thisMonth.net, data.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending This Month</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.spendingByCategory.length === 0 && (
            <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
          )}
          {data.spendingByCategory.map((cat) => (
            <div key={cat.categoryId} className="flex items-center justify-between gap-2">
              <span className="truncate">{cat.name}</span>
              <span className="font-medium shrink-0">{formatCurrency(cat.amount, data.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
