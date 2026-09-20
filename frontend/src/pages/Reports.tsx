import { useEffect, useState } from "react"
import { fetchStatement, getExportUrl } from "@/services/reports"
import { ownersApi } from "@/services/owners"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import type { Statement } from "@/types/report"
import type { Owner } from "@/types/owner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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

export default function Reports() {
  const [range, setRange] = useState<Range>(thisMonthRange)
  const [ownerId, setOwnerId] = useState("")
  const [owners, setOwners] = useState<Owner[]>([])
  const [statement, setStatement] = useState<Statement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ownersApi.list().then(setOwners).catch(() => {})
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetchStatement(range.from, range.to, ownerId || undefined)
      .then(setStatement)
      .catch((err) => setError(getErrorMessage(err, "Could not load statement")))
      .finally(() => setIsLoading(false))
  }, [range, ownerId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
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
          <div className="flex items-end gap-3">
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
      {isLoading && <p className="text-sm text-muted-foreground">Loading statement...</p>}

      {!isLoading && statement && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {ownerId ? `${owners.find((o) => o.id === ownerId)?.name}'s` : "Personal"} Statement —{" "}
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
                <div key={line.categoryId} className="flex items-center justify-between">
                  <span>{line.name}</span>
                  <span className={line.type === "expense" ? "text-red-600" : "text-green-600"}>
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

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={getExportUrl(range.from, range.to)}>
                <Download /> Export This Range (CSV)
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={getExportUrl()}>
                <Download /> Export Full History (CSV)
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
