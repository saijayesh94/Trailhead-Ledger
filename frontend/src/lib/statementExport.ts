import type { StatementRow } from "@/types/report"

export interface StatementExportMeta {
  title: string
  from: string
  to: string
  openingBalance: number
  closingBalance: number
  // Human-readable list of the table filters in effect, e.g. ["Type: Debits", "Search: \"rent\""]
  filters: string[]
}

// YYYY-MM-DD → "27 Sep 2026", built from the date parts so the local timezone
// can't shift it onto the previous/next day.
export function formatStatementDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// Plain number formatting for exports. The built-in PDF fonts have no ₹ glyph,
// so the currency lives in the column header instead of on every value.
function formatAmount(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function exportFilename(meta: StatementExportMeta, ext: string): string {
  return `trailhead-statement-${meta.from}-to-${meta.to}.${ext}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function rowCells(row: StatementRow): string[] {
  return [
    formatStatementDate(row.date),
    row.description,
    row.category,
    row.account,
    row.owner,
    row.kind === "debit" ? formatAmount(row.amount) : "",
    row.kind === "credit" ? formatAmount(row.amount) : "",
    row.kind === "transfer" ? formatAmount(row.amount) : "",
    formatAmount(row.balance),
  ]
}

const HEADER = ["Date", "Description", "Category", "Account", "Owner", "Debit", "Credit", "Transfer", "Balance"]

export function downloadStatementCsv(rows: StatementRow[], meta: StatementExportMeta) {
  const lines = [HEADER.join(",")]
  for (const row of rows) {
    // Raw numbers (no thousands separators) so spreadsheets treat them as numeric
    const amount = row.amount.toFixed(2)
    lines.push(
      [
        row.date,
        row.description,
        row.category,
        row.account,
        row.owner,
        row.kind === "debit" ? amount : "",
        row.kind === "credit" ? amount : "",
        row.kind === "transfer" ? amount : "",
        row.balance.toFixed(2),
      ]
        .map(csvEscape)
        .join(",")
    )
  }
  // BOM so Excel opens the file as UTF-8
  triggerDownload(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), exportFilename(meta, "csv"))
}

export async function downloadStatementPdf(rows: StatementRow[], meta: StatementExportMeta) {
  // Loaded on demand — jsPDF is large and only needed when someone exports.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  const credits = rows.filter((r) => r.kind === "credit").reduce((sum, r) => sum + r.amount, 0)
  const debits = rows.filter((r) => r.kind === "debit").reduce((sum, r) => sum + r.amount, 0)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(meta.title, margin, 48)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${formatStatementDate(meta.from)} to ${formatStatementDate(meta.to)}`, margin, 66)
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - margin, 66, { align: "right" })

  let y = 84
  if (meta.filters.length > 0) {
    const filterLines = doc.splitTextToSize(`Filters applied: ${meta.filters.join(" | ")}`, pageWidth - margin * 2)
    doc.text(filterLines, margin, y)
    y += filterLines.length * 12 + 4
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Opening Balance", "Total Credits", "Total Debits", "Closing Balance"]],
    body: [[formatAmount(meta.openingBalance), formatAmount(credits), formatAmount(debits), formatAmount(meta.closingBalance)]],
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
    bodyStyles: { fontSize: 11 },
  })

  autoTable(doc, {
    margin: { left: margin, right: margin, bottom: 40 },
    head: [HEADER.map((h) => (["Debit", "Credit", "Transfer", "Balance"].includes(h) ? `${h} (INR)` : h))],
    body: rows.length > 0 ? rows.map(rowCells) : [["", "No transactions match the selected filters", "", "", "", "", "", "", ""]],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: "auto" },
      5: { halign: "right", textColor: [185, 28, 28] },
      6: { halign: "right", textColor: [21, 128, 61] },
      7: { halign: "right" },
      8: { halign: "right", fontStyle: "bold" },
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" })
    doc.text("Trailhead", margin, doc.internal.pageSize.getHeight() - 20)
  }

  doc.save(exportFilename(meta, "pdf"))
}
