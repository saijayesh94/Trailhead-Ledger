import { useDeferredValue, useMemo, useState } from "react"
import { formatCurrency } from "@/lib/currency"
import { formatDisplayDate } from "@/lib/tableExport"
import { fundDate } from "@/lib/funds"
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/paymentMethods"
import { downloadFundExpensesCsv, downloadFundExpensesPdf } from "@/lib/fundExport"
import type { Fund, FundCategory, FundExpense, PaymentMethod } from "@/types/fund"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FundExpenseForm, type FundExpenseFormValues } from "@/components/funds/FundExpenseForm"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react"

type SortKey = "date" | "amount"

interface Filters {
  search: string
  categoryId: string
  paymentMethod: PaymentMethod | ""
  minAmount: string
  maxAmount: string
}

const EMPTY_FILTERS: Filters = { search: "", categoryId: "", paymentMethod: "", minAmount: "", maxAmount: "" }
const PAGE_SIZES = [25, 50, 100]

interface FundExpenseTableProps {
  fund: Fund
  expenses: FundExpense[]
  categories: FundCategory[]
  onUpdate: (id: string, values: FundExpenseFormValues) => Promise<void>
  onDelete: (expense: FundExpense) => Promise<void>
}

export function FundExpenseTable({ fund, expenses, categories, onUpdate, onDelete }: FundExpenseTableProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" })
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
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
    const result = expenses.filter((e) => {
      const amount = Number(e.amount)
      if (filters.categoryId && e.fundCategoryId !== filters.categoryId) return false
      if (filters.paymentMethod && e.paymentMethod !== filters.paymentMethod) return false
      if (min !== null && amount < min) return false
      if (max !== null && amount > max) return false
      if (search) {
        const haystack =
          `${e.description ?? ""} ${e.category.name} ${paymentMethodLabel(e.paymentMethod)} ${amount}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
    const dir = sort.dir === "asc" ? 1 : -1
    return result.sort((a, b) => {
      if (sort.key === "amount") return (Number(a.amount) - Number(b.amount)) * dir
      // Same-day expenses fall back to entry order
      return (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) * dir
    })
  }, [expenses, filters.categoryId, filters.paymentMethod, filters.minAmount, filters.maxAmount, search, sort])

  const filteredTotal = useMemo(() => filtered.reduce((sum, e) => sum + Number(e.amount), 0), [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const activeFilters: string[] = []
  if (filters.search.trim()) activeFilters.push(`Search: "${filters.search.trim()}"`)
  if (filters.categoryId)
    activeFilters.push(`Category: ${categories.find((c) => c.id === filters.categoryId)?.name ?? ""}`)
  if (filters.paymentMethod) activeFilters.push(`Paid via: ${paymentMethodLabel(filters.paymentMethod)}`)
  if (filters.minAmount) activeFilters.push(`Min: ${filters.minAmount}`)
  if (filters.maxAmount) activeFilters.push(`Max: ${filters.maxAmount}`)

  const exportMeta = { fund, filters: activeFilters }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await downloadFundExpensesPdf(filtered, exportMeta)
    } finally {
      setIsExportingPdf(false)
    }
  }

  async function handleUpdate(id: string, values: FundExpenseFormValues) {
    await onUpdate(id, values)
    setEditingId(null)
  }

  const SortIcon = sort.dir === "asc" ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Expenses</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadFundExpensesCsv(filtered, exportMeta)}>
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
              placeholder="Search description, category, amount..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
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
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
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
            Showing <strong>{filtered.length}</strong> of {expenses.length}
          </span>
          <span className="font-medium">Total {formatCurrency(filteredTotal, "INR")}</span>
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
                <th className="px-3 py-2 font-medium hidden md:table-cell">Category</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Paid via</th>
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
                    {expenses.length === 0 ? "No expenses yet." : "No expenses match these filters."}
                  </td>
                </tr>
              )}
              {pageRows.map((expense) =>
                editingId === expense.id ? (
                  <tr key={expense.id} className="border-t bg-muted/30">
                    <td colSpan={6} className="px-3 py-3">
                      <FundExpenseForm
                        categories={categories}
                        initial={{
                          amount: String(Number(expense.amount)),
                          fundCategoryId: expense.fundCategoryId,
                          paymentMethod: expense.paymentMethod,
                          description: expense.description ?? "",
                          date: fundDate(expense.date),
                        }}
                        submitLabel="Save"
                        onSubmit={(values) => handleUpdate(expense.id, values)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={expense.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground align-top hidden sm:table-cell">
                      {formatDisplayDate(fundDate(expense.date))}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium break-words">{expense.description || expense.category.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {/* Phones have no Date column, so the date rides along here */}
                        <span className="sm:hidden">{formatDisplayDate(fundDate(expense.date))} · </span>
                        {expense.category.name} · {paymentMethodLabel(expense.paymentMethod)}
                      </p>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell align-top">
                      <Badge variant="outline">{expense.category.name}</Badge>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell align-top whitespace-nowrap">
                      {paymentMethodLabel(expense.paymentMethod)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium align-top">
                      {formatCurrency(expense.amount, "INR")}
                    </td>
                    <td className="px-1 py-1 text-right whitespace-nowrap align-top">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit expense"
                        onClick={() => setEditingId(expense.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete expense" onClick={() => onDelete(expense)}>
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                )
              )}
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
