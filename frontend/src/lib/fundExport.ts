import type { Fund, FundExpense } from "@/types/fund"
import { downloadCsv, downloadTablePdf, formatDisplayDate, formatExportAmount } from "@/lib/tableExport"
import { formatFundDateRange, fundDate } from "@/lib/funds"
import { paymentMethodLabel } from "@/lib/paymentMethods"

export interface FundExportMeta {
  fund: Fund
  // Human-readable list of the table filters in effect
  filters: string[]
}

const HEADER = ["Date", "Description", "Category", "Paid via", "Amount"]

function exportFilename(fund: Fund, ext: string): string {
  const slug = fund.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fund"
  return `trailhead-fund-${slug}.${ext}`
}

function rowCells(expense: FundExpense, date: string, amount: string): string[] {
  return [
    date,
    expense.description ?? "",
    expense.category.name,
    paymentMethodLabel(expense.paymentMethod),
    amount,
  ]
}

export function downloadFundExpensesCsv(expenses: FundExpense[], { fund }: FundExportMeta) {
  downloadCsv(
    exportFilename(fund, "csv"),
    HEADER,
    expenses.map((e) => rowCells(e, fundDate(e.date), Number(e.amount).toFixed(2)))
  )
}

export async function downloadFundExpensesPdf(expenses: FundExpense[], { fund, filters }: FundExportMeta) {
  const listedTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  await downloadTablePdf({
    filename: exportFilename(fund, "pdf"),
    title: fund.name,
    subtitle: formatFundDateRange(fund) + (fund.status === "closed" ? " (closed)" : ""),
    filters,
    summary: {
      head: ["Budget", "Total Received", "Total Spent", "In Hand", "Listed Expenses"],
      body: [
        fund.budget ? formatExportAmount(Number(fund.budget)) : "-",
        formatExportAmount(Number(fund.totalDeposited)),
        formatExportAmount(Number(fund.totalSpent)),
        formatExportAmount(Number(fund.remaining)),
        formatExportAmount(listedTotal),
      ],
    },
    table: {
      head: HEADER.map((h) => (h === "Amount" ? "Amount (INR)" : h)),
      body: expenses.map((e) => rowCells(e, formatDisplayDate(fundDate(e.date)), formatExportAmount(Number(e.amount)))),
      emptyMessage: "No expenses match the selected filters",
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: "auto" },
        4: { halign: "right", fontStyle: "bold" },
      },
    },
  })
}
