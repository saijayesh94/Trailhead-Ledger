import type { StatementRow } from "@/types/report"
import { downloadCsv, downloadTablePdf, formatDisplayDate, formatExportAmount } from "@/lib/tableExport"

export interface StatementExportMeta {
  title: string
  from: string
  to: string
  openingBalance: number
  closingBalance: number
  // Human-readable list of the table filters in effect, e.g. ["Type: Debits", "Search: \"rent\""]
  filters: string[]
}

const HEADER = ["Date", "Description", "Category", "Account", "Owner", "Debit", "Credit", "Transfer", "Balance"]

function exportFilename(meta: StatementExportMeta, ext: string): string {
  return `trailhead-statement-${meta.from}-to-${meta.to}.${ext}`
}

function rowCells(row: StatementRow, date: string, amount: (value: number) => string): string[] {
  return [
    date,
    row.description,
    row.category,
    row.account,
    row.owner,
    row.kind === "debit" ? amount(row.amount) : "",
    row.kind === "credit" ? amount(row.amount) : "",
    row.kind === "transfer" ? amount(row.amount) : "",
    amount(row.balance),
  ]
}

export function downloadStatementCsv(rows: StatementRow[], meta: StatementExportMeta) {
  downloadCsv(
    exportFilename(meta, "csv"),
    HEADER,
    rows.map((row) => rowCells(row, row.date, (v) => v.toFixed(2)))
  )
}

export async function downloadStatementPdf(rows: StatementRow[], meta: StatementExportMeta) {
  const credits = rows.filter((r) => r.kind === "credit").reduce((sum, r) => sum + r.amount, 0)
  const debits = rows.filter((r) => r.kind === "debit").reduce((sum, r) => sum + r.amount, 0)

  await downloadTablePdf({
    filename: exportFilename(meta, "pdf"),
    title: meta.title,
    subtitle: `Period: ${formatDisplayDate(meta.from)} to ${formatDisplayDate(meta.to)}`,
    filters: meta.filters,
    summary: {
      head: ["Opening Balance", "Total Credits", "Total Debits", "Closing Balance"],
      body: [meta.openingBalance, credits, debits, meta.closingBalance].map(formatExportAmount),
    },
    table: {
      head: HEADER.map((h) => (["Debit", "Credit", "Transfer", "Balance"].includes(h) ? `${h} (INR)` : h)),
      body: rows.map((row) => rowCells(row, formatDisplayDate(row.date), formatExportAmount)),
      emptyMessage: "No transactions match the selected filters",
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: "auto" },
        5: { halign: "right", textColor: [185, 28, 28] },
        6: { halign: "right", textColor: [21, 128, 61] },
        7: { halign: "right" },
        8: { halign: "right", fontStyle: "bold" },
      },
    },
  })
}
