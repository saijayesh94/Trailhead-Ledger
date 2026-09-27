import { useDeferredValue, useMemo, useState } from "react"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { downloadStatementCsv, downloadStatementPdf, formatStatementDate } from "@/lib/statementExport"
import type { StatementRow } from "@/types/report"
import type { Account } from "@/types/account"
import type { Category } from "@/types/category"
import type { Owner } from "@/types/owner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileDown, FileText, Search, X } from "lucide-react"

type KindFilter = "all" | StatementRow["kind"]
type SortKey = "date" | "amount"

interface Filters {
  search: string
  kind: KindFilter
  accountId: string
  categoryId: string
  minAmount: string
  maxAmount: string
}

const EMPTY_FILTERS: Filters = { search: "", kind: "all", accountId: "", categoryId: "", minAmount: "", maxAmount: "" }
const PAGE_SIZES = [25, 50, 100]
const KIND_LABELS: Record<KindFilter, string> = {
  all: "All types",
  credit: "Credits (money in)",
  debit: "Debits (money out)",
  transfer: "Transfers",
}

interface TransactionStatementProps {
  rows: StatementRow[]
  accounts: Account[]
  categories: Category[]
  owners: Owner[]
  // Owner is filtered server-side by the page (it changes the opening/closing
  // balances), so it's controlled from outside rather than kept in `filters`.
  ownerId: string
  onOwnerChange: (ownerId: string) => void
  title: string
  from: string
  to: string
  openingBalance: number
  closingBalance: number
}

export function TransactionStatement({
  rows,
  accounts,
  categories,
  owners,
  ownerId,
  onOwnerChange,
  title,
  from,
  to,
  openingBalance,
  closingBalance,
}: TransactionStatementProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" })
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(1)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Typing stays responsive on long histories; the table catches up a frame later.
  const search = useDeferredValue(filters.search.trim().toLowerCase())

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }))
  }

  const filtered = useMemo(() => {
    const min = filters.minAmount === "" ? null : Number(filters.minAmount)
    const max = filters.maxAmount === "" ? null : Number(filters.maxAmount)
    const result = rows.filter((row) => {
      if (filters.kind !== "all" && row.kind !== filters.kind) return false
      if (filters.accountId && !row.accountIds.includes(filters.accountId)) return false
      if (filters.categoryId && row.categoryId !== filters.categoryId) return false
      if (min !== null && row.amount < min) return false
      if (max !== null && row.amount > max) return false
      if (search) {
        const haystack = `${row.description} ${row.category} ${row.account} ${row.owner} ${row.amount}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
    // `rows` arrives in chronological order, so date sorting just keeps or reverses it —
    // that preserves same-day ordering, which the running balance depends on.
    if (sort.key === "date") return sort.dir === "asc" ? result : result.reverse()
    return result.sort((a, b) => (sort.dir === "asc" ? a.amount - b.amount : b.amount - a.amount))
  }, [rows, filters.kind, filters.accountId, filters.categoryId, filters.minAmount, filters.maxAmount, search, sort])

  const totals = useMemo(() => {
    let credits = 0
    let debits = 0
    for (const row of filtered) {
      if (row.kind === "credit") credits += row.amount
      else if (row.kind === "debit") debits += row.amount
    }
    return { credits, debits }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const activeFilters: string[] = []
  if (ownerId) activeFilters.push(`Owner: ${owners.find((o) => o.id === ownerId)?.name ?? ""}`)
  if (filters.search.trim()) activeFilters.push(`Search: "${filters.search.trim()}"`)
  if (filters.kind !== "all") activeFilters.push(`Type: ${KIND_LABELS[filters.kind]}`)
  if (filters.accountId) activeFilters.push(`Account: ${accounts.find((a) => a.id === filters.accountId)?.name ?? ""}`)
  if (filters.categoryId)
    activeFilters.push(`Category: ${categories.find((c) => c.id === filters.categoryId)?.name ?? ""}`)
  if (filters.minAmount) activeFilters.push(`Min: ${filters.minAmount}`)
  if (filters.maxAmount) activeFilters.push(`Max: ${filters.maxAmount}`)

  const exportMeta = { title, from, to, openingBalance, closingBalance, filters: activeFilters }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await downloadStatementPdf(filtered, exportMeta)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const SortIcon = sort.dir === "asc" ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Transaction History</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadStatementCsv(filtered, exportMeta)}>
            <FileDown /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
            <FileText /> {isExportingPdf ? "Preparing..." : "PDF"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search description, category, account, amount..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <Select value={ownerId} onChange={(e) => onOwnerChange(e.target.value)}>
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Select value={filters.kind} onChange={(e) => updateFilter("kind", e.target.value as KindFilter)}>
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={filters.accountId} onChange={(e) => updateFilter("accountId", e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select value={filters.categoryId} onChange={(e) => updateFilter("categoryId", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Min amount"
              value={filters.minAmount}
              onChange={(e) => updateFilter("minAmount", e.target.value)}
            />
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Max amount"
              value={filters.maxAmount}
              onChange={(e) => updateFilter("maxAmount", e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              setPage(1)
              if (ownerId) onOwnerChange("")
            }}
            disabled={activeFilters.length === 0}
          >
            <X /> Clear filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span>
            Showing <strong>{filtered.length}</strong> of {rows.length}
          </span>
          <span className="text-green-600">Credits {formatCurrency(totals.credits, "INR")}</span>
          <span className="text-red-600">Debits {formatCurrency(totals.debits, "INR")}</span>
          <span className="font-medium">Net {formatCurrency(totals.credits - totals.debits, "INR")}</span>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("date")}>
                    Date {sort.key === "date" && <SortIcon className="size-3" />}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Category</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Account</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Owner</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("amount")}
                  >
                    Amount {sort.key === "amount" && <SortIcon className="size-3" />}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Balance</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    {rows.length === 0 ? "No transactions in this period." : "No transactions match these filters."}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground align-top">
                    {formatStatementDate(row.date)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium break-words">{row.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="md:hidden">{row.category} · </span>
                      <span className="lg:hidden">
                        {row.account} · {row.owner}
                      </span>
                    </p>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell align-top">
                    <Badge variant="outline">{row.category}</Badge>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell align-top">{row.account}</td>
                  <td className="px-3 py-2 hidden lg:table-cell align-top whitespace-nowrap">{row.owner}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right whitespace-nowrap font-medium align-top",
                      row.kind === "credit" && "text-green-600",
                      row.kind === "debit" && "text-red-600"
                    )}
                  >
                    {row.kind === "credit" ? "+" : row.kind === "debit" ? "-" : ""}
                    {formatCurrency(row.amount, row.currency)}
                    <span className="block text-[10px] font-normal uppercase text-muted-foreground">
                      {row.kind === "credit" ? "Cr" : row.kind === "debit" ? "Dr" : "Transfer"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap hidden sm:table-cell align-top">
                    {formatCurrency(row.balance, "INR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows per page</span>
            <Select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
