import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { fundsApi } from "@/services/funds"
import { fundCategoriesApi } from "@/services/fundCategories"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import { cn } from "@/lib/utils"
import { formatFundDateRange, formValuesToUpdateInput, fundToFormValues } from "@/lib/funds"
import type { Fund, FundCategory, FundDeposit, FundDepositInput, FundExpense, FundRecord } from "@/types/fund"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FundForm, type FundFormValues } from "@/components/funds/FundForm"
import { FundBudgetBar } from "@/components/funds/FundBudgetBar"
import { FundExpenseForm, type FundExpenseFormValues } from "@/components/funds/FundExpenseForm"
import { FundExpenseTable } from "@/components/funds/FundExpenseTable"
import { FundDeposits } from "@/components/funds/FundDeposits"
import { FundBreakdown } from "@/components/funds/FundBreakdown"
import { ArrowLeft, Lock, LockOpen, Pencil, Trash2 } from "lucide-react"

function toExpenseInput(values: FundExpenseFormValues) {
  return {
    amount: Number(values.amount),
    fundCategoryId: values.fundCategoryId,
    paymentMethod: values.paymentMethod,
    description: values.description.trim() || undefined,
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
  const activeCategories = categories.filter((c) => c.isActive)

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

  async function handleAddExpense(values: FundExpenseFormValues) {
    const created = await fundsApi.createExpense(fundId, toExpenseInput(values))
    setExpenses((prev) => [created, ...prev])
  }

  async function handleUpdateExpense(expenseId: string, values: FundExpenseFormValues) {
    const updated = await fundsApi.updateExpense(fundId, expenseId, toExpenseInput(values))
    setExpenses((prev) => prev.map((e) => (e.id === expenseId ? updated : e)))
  }

  async function handleDeleteExpense(expense: FundExpense) {
    if (!confirm(`Delete this ${formatCurrency(expense.amount, "INR")} expense?`)) return
    setError(null)
    try {
      await fundsApi.removeExpense(fundId, expense.id)
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete expense"))
    }
  }

  function rememberSource(source: string) {
    setSources((prev) => (prev.includes(source) ? prev : [...prev, source].sort((a, b) => a.localeCompare(b))))
  }

  async function handleCreateDeposit(input: FundDepositInput) {
    const created = await fundsApi.createDeposit(fundId, input)
    setDeposits((prev) => [created, ...prev])
    rememberSource(created.source)
  }

  async function handleUpdateDeposit(depositId: string, input: FundDepositInput) {
    const updated = await fundsApi.updateDeposit(fundId, depositId, input)
    setDeposits((prev) => prev.map((d) => (d.id === depositId ? updated : d)))
    rememberSource(updated.source)
  }

  async function handleDeleteDeposit(deposit: FundDeposit) {
    if (!confirm(`Delete the ${formatCurrency(deposit.amount, "INR")} from ${deposit.source}?`)) return
    setError(null)
    try {
      await fundsApi.removeDeposit(fundId, deposit.id)
      setDeposits((prev) => prev.filter((d) => d.id !== deposit.id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete deposit"))
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

      {fund.budget && <FundBudgetBar spent={spent} budget={Number(fund.budget)} />}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          {isClosed ? (
            <p className="text-sm text-muted-foreground">This fund is closed. Reopen it to add expenses.</p>
          ) : activeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active fund categories.{" "}
              <Link to="/settings" className="underline">
                Add one in Settings
              </Link>{" "}
              first.
            </p>
          ) : (
            <FundExpenseForm
              categories={categories}
              initial={{
                amount: "",
                fundCategoryId: activeCategories[0].id,
                paymentMethod: "upi",
                description: "",
                date: toISODate(),
              }}
              submitLabel="Add"
              onSubmit={handleAddExpense}
              keepOpen
            />
          )}
        </CardContent>
      </Card>

      <FundExpenseTable
        fund={fund}
        expenses={expenses}
        categories={categories}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <FundBreakdown expenses={expenses} />

      <FundDeposits
        deposits={deposits}
        sources={sources}
        canAdd={!isClosed}
        onCreate={handleCreateDeposit}
        onUpdate={handleUpdateDeposit}
        onDelete={handleDeleteDeposit}
      />
    </div>
  )
}
