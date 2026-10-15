import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { fundsApi } from "@/services/funds"
import { fundCategoriesApi } from "@/services/fundCategories"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { formatFundDateRange, formValuesToUpdateInput, fundToFormValues } from "@/lib/funds"
import type { Fund, FundCategory, FundDeposit, FundEntry, FundExpense, FundRecord } from "@/types/fund"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FundForm, type FundFormValues } from "@/components/funds/FundForm"
import { FundEntryTable } from "@/components/funds/FundEntryTable"
import type { FundEntryFormValues } from "@/components/funds/FundEntryForm"
import { ArrowLeft, Lock, LockOpen, Pencil, Trash2 } from "lucide-react"

function toExpenseInput(values: FundEntryFormValues) {
  return {
    amount: Number(values.amount),
    fundCategoryId: values.fundCategoryId,
    paymentMethod: values.paymentMethod,
    description: values.description.trim() || undefined,
    date: values.date,
  }
}

function toDepositInput(values: FundEntryFormValues) {
  return {
    amount: Number(values.amount),
    source: values.source.trim(),
    paymentMethod: values.paymentMethod,
    note: values.description.trim() || undefined,
    date: values.date,
  }
}

function SummaryTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold break-words", className)}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function FundDetail() {
  const { id = "" } = useParams()
  const navigate = useNavigate()

  const [fundRecord, setFundRecord] = useState<FundRecord | null>(null)
  const [deposits, setDeposits] = useState<FundDeposit[]>([])
  const [expenses, setExpenses] = useState<FundExpense[]>([])
  const [categories, setCategories] = useState<FundCategory[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([fundsApi.get(id), fundCategoriesApi.list()])
      .then(([detail, cats]) => {
        setFundRecord(detail.fund)
        setDeposits(detail.deposits)
        setExpenses(detail.expenses)
        setCategories(cats)
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load fund")))
      .finally(() => setIsLoading(false))
    fundsApi.depositSources().then(setSources).catch(() => {})
  }, [id])

  // Totals are derived from the lists held here, so every add/edit/delete
  // updates them immediately without refetching the fund.
  const fund = useMemo<Fund | null>(() => {
    if (!fundRecord) return null
    const deposited = deposits.reduce((sum, d) => sum + Number(d.amount), 0)
    const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    return {
      ...fundRecord,
      totalDeposited: deposited.toFixed(2),
      totalSpent: spent.toFixed(2),
      remaining: (deposited - spent).toFixed(2),
      expenseCount: expenses.length,
    }
  }, [fundRecord, deposits, expenses])

  const entries = useMemo<FundEntry[]>(
    () => [
      ...deposits.map((data) => ({ kind: "received" as const, data })),
      ...expenses.map((data) => ({ kind: "spent" as const, data })),
    ],
    [deposits, expenses]
  )

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading fund...</p>

  if (!fund) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{error ?? "Fund not found"}</p>
        <Link to="/funds" className="text-sm underline">
          Back to all funds
        </Link>
      </div>
    )
  }

  const fundId = fund.id
  const isClosed = fund.status === "closed"
  const spent = Number(fund.totalSpent)
  const deposited = Number(fund.totalDeposited)
  const remaining = Number(fund.remaining)

  async function handleUpdateFund(values: FundFormValues) {
    const updated = await fundsApi.update(fundId, formValuesToUpdateInput(values))
    setFundRecord(updated)
    setIsEditing(false)
  }

  async function handleToggleStatus() {
    setError(null)
    try {
      setFundRecord(await fundsApi.update(fundId, { status: isClosed ? "active" : "closed" }))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update fund"))
    }
  }

  async function handleDeleteFund() {
    if (!confirm(`Delete "${fund!.name}" along with all its deposits and expenses? This cannot be undone.`)) return
    setError(null)
    try {
      await fundsApi.remove(fundId)
      navigate("/funds", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete fund"))
    }
  }

  function rememberSource(source: string) {
    setSources((prev) => (prev.includes(source) ? prev : [...prev, source].sort((a, b) => a.localeCompare(b))))
  }

  async function handleCreateEntry(values: FundEntryFormValues) {
    if (values.kind === "spent") {
      const created = await fundsApi.createExpense(fundId, toExpenseInput(values))
      setExpenses((prev) => [created, ...prev])
    } else {
      const created = await fundsApi.createDeposit(fundId, toDepositInput(values))
      setDeposits((prev) => [created, ...prev])
      rememberSource(created.source)
    }
  }

  async function handleUpdateEntry(entry: FundEntry, values: FundEntryFormValues) {
    if (entry.kind === "spent") {
      const updated = await fundsApi.updateExpense(fundId, entry.data.id, toExpenseInput(values))
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } else {
      const updated = await fundsApi.updateDeposit(fundId, entry.data.id, toDepositInput(values))
      setDeposits((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      rememberSource(updated.source)
    }
  }

  async function handleDeleteEntry(entry: FundEntry) {
    const amount = formatCurrency(entry.data.amount, "INR")
    const message =
      entry.kind === "spent" ? `Delete this ${amount} expense?` : `Delete the ${amount} from ${entry.data.source}?`
    if (!confirm(message)) return
    setError(null)
    try {
      if (entry.kind === "spent") {
        await fundsApi.removeExpense(fundId, entry.data.id)
        setExpenses((prev) => prev.filter((e) => e.id !== entry.data.id))
      } else {
        await fundsApi.removeDeposit(fundId, entry.data.id)
        setDeposits((prev) => prev.filter((d) => d.id !== entry.data.id))
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete entry"))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/funds" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All funds
      </Link>

      {isEditing ? (
        <FundForm
          initial={fundToFormValues(fund)}
          submitLabel="Save changes"
          onSubmit={handleUpdateFund}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold break-words">{fund.name}</h1>
              <Badge variant={isClosed ? "secondary" : "default"}>{isClosed ? "Closed" : "Active"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formatFundDateRange(fund)}</p>
            {fund.description && <p className="text-sm">{fund.description}</p>}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={handleToggleStatus}>
              {isClosed ? <LockOpen /> : <Lock />}
              {isClosed ? "Reopen" : "Close"}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete fund" onClick={handleDeleteFund}>
              <Trash2 />
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Spent" value={formatCurrency(spent, "INR")} />
        <SummaryTile label="Received" value={deposited > 0 ? formatCurrency(deposited, "INR") : "—"} />
        <SummaryTile
          label={remaining < 0 ? "Overspent" : "In hand"}
          value={deposited > 0 ? formatCurrency(Math.abs(remaining), "INR") : "—"}
          className={deposited > 0 ? (remaining < 0 ? "text-red-600" : "text-green-600") : undefined}
        />
        <SummaryTile
          label="Budget"
          value={fund.budget ? formatCurrency(fund.budget, "INR") : "Not set"}
          className={fund.budget ? undefined : "text-muted-foreground"}
        />
      </div>

      <FundEntryTable
        fund={fund}
        entries={entries}
        categories={categories}
        sources={sources}
        addBlockedReason={isClosed ? "This fund is closed. Reopen it to add entries." : null}
        onCreate={handleCreateEntry}
        onUpdate={handleUpdateEntry}
        onDelete={handleDeleteEntry}
      />
    </div>
  )
}
