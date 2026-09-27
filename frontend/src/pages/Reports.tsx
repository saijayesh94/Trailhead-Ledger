import { useEffect, useMemo, useState } from "react"
import { fetchStatement } from "@/services/reports"
import { ownersApi } from "@/services/owners"
import { accountsApi } from "@/services/accounts"
import { categoriesApi } from "@/services/categories"
import { transactionsApi } from "@/services/transactions"
import { transfersApi } from "@/services/transfers"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import { cn } from "@/lib/utils"
import type { Statement, StatementRow } from "@/types/report"
import type { Owner } from "@/types/owner"
import type { Account } from "@/types/account"
import type { Category } from "@/types/category"
import type { Transaction } from "@/types/transaction"
import type { Transfer } from "@/types/transfer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TransactionStatement } from "@/components/reports/TransactionStatement"

interface Range {
  from: string
  to: string
}

function thisMonthRange(): Range {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function lastMonthRange(): Range {
  const now = new Date()
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}

function thisYearRange(): Range {
  const year = new Date().getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

function lastYearRange(): Range {
  const year = new Date().getFullYear() - 1
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

const PRESETS = [
  { label: "This Month", getRange: thisMonthRange },
  { label: "Last Month", getRange: lastMonthRange },
  { label: "This Year", getRange: thisYearRange },
  { label: "Last Year", getRange: lastYearRange },
]

function formatRangeLabel(from: string, to: string) {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
  return `${fromDate.toLocaleDateString(undefined, opts)} – ${toDate.toLocaleDateString(undefined, opts)}`
}

// Merges transactions and transfers into chronological statement rows with a
// running balance that starts from the statement's opening balance. Mirrors
// computeTotalBalanceAsOf on the backend: income/received add, expenses
// subtract, transfers are neutral.
function buildStatementRows(
  transactions: Transaction[],
  transfers: Transfer[],
  openingBalance: number
): StatementRow[] {
  // Both APIs return newest-first; reversing gives oldest-first with same-day
  // entries in creation order, and the sort below is stable.
  const entries = [
    ...[...transactions].reverse().map((t) => ({ kind: "transaction" as const, date: t.date.slice(0, 10), t })),
    ...[...transfers].reverse().map((t) => ({ kind: "transfer" as const, date: t.date.slice(0, 10), t })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let balance = openingBalance
  return entries.map((entry): StatementRow => {
    if (entry.kind === "transfer") {
      const t = entry.t
      return {
        id: `transfer-${t.id}`,
        kind: "transfer",
        date: entry.date,
        description: t.description || `Transfer ${t.fromAccount.name} → ${t.toAccount.name}`,
        category: "Transfer",
        categoryId: null,
        account: `${t.fromAccount.name} → ${t.toAccount.name}`,
        accountIds: [t.fromAccountId, t.toAccountId],
        owner: t.owner.name,
        currency: t.fromAccount.currency,
        amount: Number(t.amount),
        balance,
      }
    }
    const t = entry.t
    const amount = Number(t.amount)
    const isDebit = t.type === "expense"
    balance += isDebit ? -amount : amount
    return {
      id: `txn-${t.id}`,
      kind: isDebit ? "debit" : "credit",
      date: entry.date,
      description: t.description || t.category.name,
      category: t.category.name,
      categoryId: t.categoryId,
      account: t.account.name,
      accountIds: [t.accountId],
      owner: t.owner.name,
      currency: t.account.currency,
      amount,
      balance,
    }
  })
}

function nextDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  return toISODate(new Date(y, m - 1, d + 1))
}

export default function Reports() {
  const [range, setRange] = useState<Range>(thisMonthRange)
  const [ownerId, setOwnerId] = useState("")
  const [owners, setOwners] = useState<Owner[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statement, setStatement] = useState<Statement | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ownersApi.list().then(setOwners).catch(() => {})
    accountsApi.list().then(setAccounts).catch(() => {})
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([
      fetchStatement(range.from, range.to, ownerId || undefined),
      // The API's `to` is compared against midnight, so ask for up to the next
      // day and trim precisely below — same inclusive range as the statement.
      transactionsApi.list({ from: range.from, to: nextDay(range.to), ownerId: ownerId || undefined }),
      transfersApi.list(),
    ])
      .then(([stmt, txns, trns]) => {
        const inRange = (date: string) => {
          const day = date.slice(0, 10)
          return day >= range.from && day <= range.to
        }
        setStatement(stmt)
        setTransactions(txns.filter((t) => inRange(t.date)))
        setTransfers(trns.filter((t) => inRange(t.date) && (!ownerId || t.ownerId === ownerId)))
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load statement")))
      .finally(() => setIsLoading(false))
  }, [range, ownerId])

  const statementRows = useMemo(
    () => buildStatementRows(transactions, transfers, Number(statement?.openingBalance ?? 0)),
    [transactions, transfers, statement]
  )

  const ownerName = ownerId ? owners.find((o) => o.id === ownerId)?.name : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Reports</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button key={preset.label} size="sm" variant="outline" onClick={() => setRange(preset.getRange())}>
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={range.to}
                min={range.from}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {isLoading && !statement && <p className="text-sm text-muted-foreground">Loading statement...</p>}

      {statement && (
        <div className={cn("flex flex-col gap-4 transition-opacity", isLoading && "opacity-60")}>
          <Card>
            <CardHeader>
              <CardTitle>
                {ownerName ? `${ownerName}'s` : "Personal"} Statement —{" "}
                {formatRangeLabel(statement.from, statement.to)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-muted-foreground">Opening Balance</span>
                <span className="font-medium">{formatCurrency(statement.openingBalance, "INR")}</span>
              </div>

              {statement.lines.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No activity in this period.</p>
              )}

              {statement.lines.map((line) => (
                <div key={line.categoryId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{line.name}</span>
                  <span className={cn("shrink-0", line.type === "expense" ? "text-red-600" : "text-green-600")}>
                    {Number(line.amount) >= 0 ? "+" : ""}
                    {formatCurrency(line.amount, "INR")}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between border-t pt-3 font-semibold">
                <span>Closing Balance</span>
                <span>{formatCurrency(statement.closingBalance, "INR")}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(statement.totalIncome, "INR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-xl font-semibold text-red-600">
                  {formatCurrency(statement.totalExpenses, "INR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Net</p>
                <p className={`text-xl font-semibold ${Number(statement.net) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(statement.net, "INR")}
                </p>
              </CardContent>
            </Card>
          </div>

          <TransactionStatement
            rows={statementRows}
            accounts={accounts}
            categories={categories}
            owners={owners}
            ownerId={ownerId}
            onOwnerChange={setOwnerId}
            title={`${ownerName ? `${ownerName}'s` : "Personal"} Statement`}
            from={range.from}
            to={range.to}
            openingBalance={Number(statement.openingBalance)}
            closingBalance={Number(statement.closingBalance)}
          />
        </div>
      )}
    </div>
  )
}
