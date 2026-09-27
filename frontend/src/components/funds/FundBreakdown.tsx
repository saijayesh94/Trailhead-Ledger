import { formatCurrency } from "@/lib/currency"
import { paymentMethodLabel } from "@/lib/paymentMethods"
import type { FundExpense } from "@/types/fund"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BreakdownRow {
  key: string
  label: string
  amount: number
  count: number
}

function groupBy(expenses: FundExpense[], keyOf: (e: FundExpense) => string, labelOf: (e: FundExpense) => string) {
  const rows = new Map<string, BreakdownRow>()
  for (const e of expenses) {
    const key = keyOf(e)
    const row = rows.get(key) ?? { key, label: labelOf(e), amount: 0, count: 0 }
    row.amount += Number(e.amount)
    row.count += 1
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

function BreakdownList({ title, hint, rows, total }: { title: string; hint?: string; rows: BreakdownRow[]; total: number }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing spent yet.</p>}
        {rows.map((row) => {
          const share = total > 0 ? row.amount / total : 0
          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {row.label} <span className="text-muted-foreground">· {row.count}</span>
                </span>
                <span className="font-medium shrink-0">
                  {formatCurrency(row.amount, "INR")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{Math.round(share * 100)}%</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function FundBreakdown({ expenses }: { expenses: FundExpense[] }) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const byCategory = groupBy(
    expenses,
    (e) => e.fundCategoryId,
    (e) => e.category.name
  )
  const byMethod = groupBy(
    expenses,
    (e) => e.paymentMethod,
    (e) => paymentMethodLabel(e.paymentMethod)
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BreakdownList title="By Category" rows={byCategory} total={total} />
      <BreakdownList
        title="By Payment Method"
        hint="Handy when adding this spending to your main tracker by hand."
        rows={byMethod}
        total={total}
      />
    </div>
  )
}
