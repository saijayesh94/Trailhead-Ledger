import type { Fund, FundEntry } from "@/types/fund"
import { downloadCsv, downloadTablePdf, formatDisplayDate, formatExportAmount } from "@/lib/tableExport"
import { formatFundDateRange, fundDate, fundEntryLabel, fundEntryNote, fundEntrySignedAmount } from "@/lib/funds"
import { paymentMethodLabel } from "@/lib/paymentMethods"

export interface FundExportMeta {
  fund: Fund
  // Human-readable list of the table filters in effect
  filters: string[]
}

const HEADER = ["Date", "Type", "Description", "Category / From", "Via", "Amount"]

function exportFilename(fund: Fund, ext: string): string {
  const slug = fund.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fund"
  return `trailhead-fund-${slug}.${ext}`
}

function rowCells(entry: FundEntry, date: string, amount: string): string[] {
  return [
    date,
    entry.kind === "spent" ? "Spent" : "Received",
    fundEntryNote(entry) ?? "",
    fundEntryLabel(entry),
    paymentMethodLabel(entry.data.paymentMethod),
    amount,
  ]
}

// Amounts are signed: received positive, spent negative
export function downloadFundEntriesCsv(entries: FundEntry[], { fund }: FundExportMeta) {
  downloadCsv(
    exportFilename(fund, "csv"),
    HEADER,
    entries.map((e) => rowCells(e, fundDate(e.data.date), fundEntrySignedAmount(e).toFixed(2)))
  )
}

export async function downloadFundEntriesPdf(entries: FundEntry[], { fund, filters }: FundExportMeta) {
  const sum = (kind: FundEntry["kind"]) =>
    entries.filter((e) => e.kind === kind).reduce((total, e) => total + Number(e.data.amount), 0)

  await downloadTablePdf({
    filename: exportFilename(fund, "pdf"),
    title: fund.name,
    subtitle: formatFundDateRange(fund) + (fund.status === "closed" ? " (closed)" : ""),
    filters,
    summary: {
      head: ["Budget", "Total Received", "Total Spent", "In Hand", "Listed Received", "Listed Spent"],
      body: [
        fund.budget ? formatExportAmount(Number(fund.budget)) : "-",
        formatExportAmount(Number(fund.totalDeposited)),
        formatExportAmount(Number(fund.totalSpent)),
        formatExportAmount(Number(fund.remaining)),
        formatExportAmount(sum("received")),
        formatExportAmount(sum("spent")),
      ],
    },
    table: {
      head: HEADER.map((h) => (h === "Amount" ? "Amount (INR)" : h)),
      body: entries.map((e) => {
        const amount = fundEntrySignedAmount(e)
        return rowCells(
          e,
          formatDisplayDate(fundDate(e.data.date)),
          `${amount < 0 ? "-" : "+"}${formatExportAmount(Math.abs(amount))}`
        )
      }),
      emptyMessage: "No entries match the selected filters",
      columnStyles: {
        0: { cellWidth: 70 },
        2: { cellWidth: "auto" },
        5: { halign: "right", fontStyle: "bold" },
      },
    },
  })
}
