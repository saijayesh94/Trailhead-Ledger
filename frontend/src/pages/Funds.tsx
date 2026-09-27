import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fundsApi } from "@/services/funds"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import { cn } from "@/lib/utils"
import { formatFundDateRange, formValuesToCreateInput, formValuesToUpdateInput, fundToFormValues } from "@/lib/funds"
import type { Fund, FundStatus } from "@/types/fund"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FundForm, type FundFormValues } from "@/components/funds/FundForm"
import { FundBudgetBar } from "@/components/funds/FundBudgetBar"
import { Plus, X, Pencil, Trash2, Lock, LockOpen, ChevronRight } from "lucide-react"

type StatusFilter = FundStatus | "all"

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
]

const EMPTY_FORM: FundFormValues = { name: "", description: "", budget: "", startDate: "", endDate: "" }

export default function Funds() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fundsApi
      .list()
      .then(setFunds)
      .catch((err) => setError(getErrorMessage(err, "Could not load funds")))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleCreate(values: FundFormValues) {
    const created = await fundsApi.create(formValuesToCreateInput(values))
    setFunds((prev) => [created, ...prev])
    setIsCreating(false)
    setStatusFilter((f) => (f === "closed" ? "active" : f))
  }

  async function handleUpdate(id: string, values: FundFormValues) {
    const updated = await fundsApi.update(id, formValuesToUpdateInput(values))
    // PATCH returns the stored fund only; its totals haven't changed
    setFunds((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)))
    setEditingId(null)
  }

  async function handleToggleStatus(fund: Fund) {
    setError(null)
    try {
      const updated = await fundsApi.update(fund.id, { status: fund.status === "active" ? "closed" : "active" })
      setFunds((prev) => prev.map((f) => (f.id === fund.id ? { ...f, ...updated } : f)))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update fund"))
    }
  }

  async function handleDelete(fund: Fund) {
    if (!confirm(`Delete "${fund.name}" along with all its deposits and expenses? This cannot be undone.`)) return
    setError(null)
    try {
      await fundsApi.remove(fund.id)
      setFunds((prev) => prev.filter((f) => f.id !== fund.id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete fund"))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading funds...</p>

  const counts: Record<StatusFilter, number> = {
    active: funds.filter((f) => f.status === "active").length,
    closed: funds.filter((f) => f.status === "closed").length,
    all: funds.length,
  }
  const visibleFunds = statusFilter === "all" ? funds : funds.filter((f) => f.status === statusFilter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Funds</h1>
          <p className="text-sm text-muted-foreground">
            Track money for a trip, a function or a project — separate from your main tracker.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setIsCreating((v) => !v)
            setEditingId(null)
          }}
        >
          {isCreating ? <X /> : <Plus />}
          {isCreating ? "Cancel" : "New fund"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isCreating && (
        <FundForm
          initial={{ ...EMPTY_FORM, startDate: toISODate() }}
          submitLabel="Create fund"
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {funds.length > 0 && (
        <div className="flex gap-1 border-b overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                statusFilter === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      )}

      {funds.length === 0 && !isCreating && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground max-w-md">
              No funds yet. Create one for a trip, a family function or a project to track what goes in and what gets
              spent — it won't affect your account balances.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus /> Create your first fund
            </Button>
          </CardContent>
        </Card>
      )}

      {funds.length > 0 && visibleFunds.length === 0 && (
        <p className="text-sm text-muted-foreground">No {statusFilter} funds.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFunds.map((fund) => {
          if (editingId === fund.id) {
            return (
              <div key={fund.id} className="md:col-span-2">
                <FundForm
                  initial={fundToFormValues(fund)}
                  submitLabel="Save changes"
                  onSubmit={(values) => handleUpdate(fund.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }

          const spent = Number(fund.totalSpent)
          const deposited = Number(fund.totalDeposited)
          const remaining = Number(fund.remaining)
          const isClosed = fund.status === "closed"

          return (
            <Card key={fund.id} className={cn("gap-4 py-4", isClosed && "opacity-75")}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/funds/${fund.id}`} className="font-semibold hover:underline break-words">
                      {fund.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatFundDateRange(fund)}</p>
                  </div>
                  <Badge variant={isClosed ? "secondary" : "default"} className="shrink-0">
                    {isClosed ? "Closed" : "Active"}
                  </Badge>
                </div>

                {fund.description && <p className="text-sm text-muted-foreground line-clamp-2">{fund.description}</p>}

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    Spent · {fund.expenseCount} {fund.expenseCount === 1 ? "expense" : "expenses"}
                  </span>
                  <span className="text-xl font-semibold">{formatCurrency(spent, "INR")}</span>
                </div>

                {fund.budget && <FundBudgetBar spent={spent} budget={Number(fund.budget)} />}

                {deposited > 0 && (
                  <div className="flex items-center justify-between gap-2 text-sm border-t pt-2">
                    <span className="text-muted-foreground">Received {formatCurrency(deposited, "INR")}</span>
                    <span className={cn("font-medium", remaining < 0 ? "text-red-600" : "text-green-600")}>
                      {remaining < 0
                        ? `${formatCurrency(-remaining, "INR")} overspent`
                        : `${formatCurrency(remaining, "INR")} in hand`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-1 border-t pt-2">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit fund"
                      onClick={() => {
                        setEditingId(fund.id)
                        setIsCreating(false)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(fund)}>
                      {isClosed ? <LockOpen /> : <Lock />}
                      {isClosed ? "Reopen" : "Close"}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete fund" onClick={() => handleDelete(fund)}>
                      <Trash2 />
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/funds/${fund.id}`}>
                      Open <ChevronRight />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
