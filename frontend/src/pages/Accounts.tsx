import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { accountsApi } from "@/services/accounts"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import type { Account } from "@/types/account"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setError(getErrorMessage(err, "Could not load accounts")))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading accounts...</p>

  const activeAccounts = accounts.filter((a) => a.isActive)
  // Only sum accounts sharing the majority currency to avoid adding INR + USD together.
  const primaryCurrency = activeAccounts[0]?.currency ?? "INR"
  const totalBalance = activeAccounts
    .filter((a) => a.currency === primaryCurrency)
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Button size="sm" variant="outline" asChild>
          <Link to="/settings">Manage accounts</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {accounts.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">
              You haven't added any accounts yet. Add your first bank account to start tracking balances.
            </p>
            <Button asChild>
              <Link to="/settings">Add an account</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-normal">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalBalance, primaryCurrency)}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{account.name}</CardTitle>
                {account.bankName && (
                  <p className="text-sm text-muted-foreground">{account.bankName}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Badge variant="outline">{account.type}</Badge>
                {!account.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(account.balance ?? "0", account.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
