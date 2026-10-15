import { useDeferredValue, useMemo, useState, type ReactNode } from "react"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import { formatDisplayDate } from "@/lib/tableExport"
import { fundDate, fundEntryLabel, fundEntryNote } from "@/lib/funds"
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/paymentMethods"
import { downloadFundEntriesCsv, downloadFundEntriesPdf } from "@/lib/fundExport"
import { cn } from "@/lib/utils"
import type { Fund, FundCategory, FundEntry, PaymentMethod } from "@/types/fund"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FundEntryForm, type FundEntryFormValues } from "@/components/funds/FundEntryForm"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"

type SortKey = "date" | "amount"

interface Filters {
  search: string
  kind: FundEntry["kind"] | ""
  categoryId: string
  paymentMethod: PaymentMethod | ""
  minAmount: string
  maxAmount: string
}

const EMPTY_FILTERS: Filters = {
  search: "",
  kind: "",
  categoryId: "",
  paymentMethod: "",
  minAmount: "",
  maxAmount: "",
}
const PAGE_SIZES = [25, 50, 100]

function entryKey(entry: FundEntry) {
  return `${entry.kind}-${entry.data.id}`
}

function toFormValues(entry: FundEntry): FundEntryFormValues {
  return {
    kind: entry.kind,
    amount: String(Number(entry.data.amount)),
    fundCategoryId: entry.kind === "spent" ? entry.data.fundCategoryId : "",
    source: entry.kind === "received" ? entry.data.source : "",
    paymentMethod: entry.data.paymentMethod,
    description: fundEntryNote(entry) ?? "",
    date: fundDate(entry.data.date),
  }
}

interface FundEntryTableProps {
  fund: Fund
  entries: FundEntry[]
  categories: FundCategory[]
  sources: string[]
  // Why adding is unavailable (closed fund, no categories…), or null when it is
  addBlockedReason: ReactNode | null
  onCreate: (values: FundEntryFormValues) => Promise<void>
  onUpdate: (entry: FundEntry, values: FundEntryFormValues) => Promise<void>
  onDelete: (entry: FundEntry) => Promise<void>
}

export function FundEntryTable({
  fund,
  entries,
  categories,
  sources,
  addBlockedReason,
  onCreate,
  onUpdate,
  onDelete,
}: FundEntryTableProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" })
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Typing stays responsive on long lists; the table catches up a frame later.
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
    const result = entries.filter((entry) => {
      const amount = Number(entry.data.amount)
      if (filters.kind && entry.kind !== filters.kind) return false
      // Categories only exist on money spent
      if (filters.categoryId && (entry.kind !== "spent" || entry.data.fundCategoryId !== filters.categoryId))
        return false
      if (filters.paymentMethod && entry.data.paymentMethod !== filters.paymentMethod) return false
      if (min !== null && amount < min) return false
      if (max !== null && amount > max) return false
      if (search) {
        const haystack =
          `${fundEntryNote(entry) ?? ""} ${fundEntryLabel(entry)} ${paymentMethodLabel(entry.data.paymentMethod)} ${amount}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
    const dir = sort.dir === "asc" ? 1 : -1
    return result.sort((a, b) => {
      if (sort.key === "amount") return (Number(a.data.amount) - Number(b.data.amount)) * dir
      // Same-day entries fall back to entry order
      return (a.data.date.localeCompare(b.data.date) || a.data.createdAt.localeCompare(b.data.createdAt)) * dir
    })
  }, [
    entries,
    filters.kind,
    filters.categoryId,
    filters.paymentMethod,
    filters.minAmount,
    filters.maxAmount,
    search,
    sort,
  ])

  const filteredTotals = useMemo(() => {
    let received = 0
    let spent = 0
    for (const entry of filtered) {
      if (entry.kind === "received") received += Number(entry.data.amount)
      else spent += Number(entry.data.amount)
    }
    return { received, spent }
  }, [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const activeFilters: string[] = []
  if (filters.search.trim()) activeFilters.push(`Search: "${filters.search.trim()}"`)
  if (filters.kind) activeFilters.push(`Type: ${filters.kind === "spent" ? "Spent" : "Received"}`)
  if (filters.categoryId)
    activeFilters.push(`Category: ${categories.find((c) => c.id === filters.categoryId)?.name ?? ""}`)
  if (filters.paymentMethod) activeFilters.push(`Via: ${paymentMethodLabel(filters.paymentMethod)}`)
  if (filters.minAmount) activeFilters.push(`Min: ${filters.minAmount}`)
  if (filters.maxAmount) activeFilters.push(`Max: ${filters.maxAmount}`)

  const exportMeta = { fund, filters: activeFilters }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await downloadFundEntriesPdf(filtered, exportMeta)
    } finally {
      setIsExportingPdf(false)
    }
  }

  async function handleUpdate(entry: FundEntry, values: FundEntryFormValues) {
    await onUpdate(entry, values)
    setEditingKey(null)
  }

  const activeCategories = categories.filter((c) => c.isActive)
  const SortIcon = sort.dir === "asc" ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Entries</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadFundEntriesCsv(filtered, exportMeta)}>
            <FileDown /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
            <FileText /> {isExportingPdf ? "Preparing..." : "PDF"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setIsAdding((v) => !v)
              setEditingKey(null)
            }}
          >
            {isAdding ? <X /> : <Plus />}
            {isAdding ? "Done" : "Add Entry"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isAdding &&
          (addBlockedReason ? (
            <p className="rounded-md border p-3 text-sm text-muted-foreground">{addBlockedReason}</p>
          ) : (
            <div className="rounded-md border p-3">
              <FundEntryForm
                categories={categories}
                sources={sources}
                initial={{
                  kind: "spent",
                  amount: "",
                  fundCategoryId: activeCategories[0]?.id ?? "",
                  source: "",
                  paymentMethod: "upi",
                  description: "",
                  date: toISODate(),
                }}
                submitLabel="Add"
                onSubmit={onCreate}
                onCancel={() => setIsAdding(false)}
                keepOpen
              />
            </div>
          ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search description, category, source, amount..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
          <Select value={filters.kind} onChange={(e) => updateFilter("kind", e.target.value as Filters["kind"])}>
            <option value="">Received &amp; spent</option>
            <option value="received">Received only</option>
            <option value="spent">Spent only</option>
          </Select>
          <Select value={filters.categoryId} onChange={(e) => updateFilter("categoryId", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.paymentMethod}
            onChange={(e) => updateFilter("paymentMethod", e.target.value as PaymentMethod | "")}
          >
            <option value="">All payment methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-1 lg:col-span-2">
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
            }}
            disabled={activeFilters.length === 0}
          >
            <X /> Clear filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span>
            Showing <strong>{filtered.length}</strong> of {entries.length}
          </span>
          <span className="font-medium text-green-600">Received {formatCurrency(filteredTotals.received, "INR")}</span>
          <span className="font-medium text-red-600">Spent {formatCurrency(filteredTotals.spent, "INR")}</span>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap hidden sm:table-cell">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("date")}>
                    Date {sort.key === "date" && <SortIcon className="size-3" />}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  {/* On phones the Date column is hidden, so date sorting lives here */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 sm:hidden"
                    onClick={() => toggleSort("date")}
                  >
                    Date {sort.key === "date" && <SortIcon className="size-3" />}
                  </button>
                  <span className="hidden sm:inline">Description</span>
                </th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Category / From</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Via</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("amount")}
                  >
                    Amount {sort.key === "amount" && <SortIcon className="size-3" />}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {entries.length === 0 ? "No entries yet." : "No entries match these filters."}
                  </td>
                </tr>
              )}
              {pageRows.map((entry) => {
                const key = entryKey(entry)
                const isSpent = entry.kind === "spent"
                const label = fundEntryLabel(entry)
                const note = fundEntryNote(entry)
                const via = paymentMethodLabel(entry.data.paymentMethod)
                const date = formatDisplayDate(fundDate(entry.data.date))

                if (editingKey === key) {
                  return (
                    <tr key={key} className="border-t bg-muted/30">
                      <td colSpan={6} className="px-3 py-3">
                        <FundEntryForm
                          categories={categories}
                          sources={sources}
                          initial={toFormValues(entry)}
                          submitLabel="Save"
                          onSubmit={(values) => handleUpdate(entry, values)}
                          onCancel={() => setEditingKey(null)}
                          lockKind
                        />
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={key} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground align-top hidden sm:table-cell">
                      {date}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium break-words">{note || (isSpent ? label : `From ${label}`)}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {/* Phones have no Date column, so the date rides along here */}
                        <span className="sm:hidden">{date} · </span>
                        {isSpent ? label : `Received from ${label}`} · {via}
                      </p>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell align-top">
                      {isSpent ? (
                        <Badge variant="outline">{label}</Badge>
                      ) : (
                        <span className="text-green-600">From {label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell align-top whitespace-nowrap">{via}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right whitespace-nowrap font-medium align-top",
                        isSpent ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {isSpent ? "-" : "+"}
                      {formatCurrency(entry.data.amount, "INR")}
                    </td>
                    <td className="px-1 py-1 text-right whitespace-nowrap align-top">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit entry"
                        onClick={() => {
                          setEditingKey(key)
                          setIsAdding(false)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={() => onDelete(entry)}>
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                )
              })}
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
