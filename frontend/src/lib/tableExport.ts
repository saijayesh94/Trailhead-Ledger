import type { UserOptions } from "jspdf-autotable"

// Shared CSV/PDF export helpers for the Reports statement and Fund expenses.

// YYYY-MM-DD → "27 Sep 2026", built from the date parts so the local timezone
// can't shift it onto the previous/next day.
export function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// Plain number formatting for exports. The built-in PDF fonts have no ₹ glyph,
// so the currency lives in the column header instead of on every value.
export function formatExportAmount(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Amount cells should be raw numbers (e.g. "1234.50", no thousands
// separators) so spreadsheets treat them as numeric.
export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const lines = [header, ...rows].map((cells) => cells.map(csvEscape).join(","))
  // BOM so Excel opens the file as UTF-8
  triggerDownload(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename)
}

export interface PdfTableExport {
  filename: string
  title: string
  subtitle: string
  // Human-readable list of the table filters in effect, e.g. ["Type: Debits", "Search: \"rent\""]
  filters: string[]
  summary: { head: string[]; body: string[] }
  table: {
    head: string[]
    body: string[][]
    emptyMessage: string
    columnStyles?: UserOptions["columnStyles"]
  }
}

export async function downloadTablePdf({ filename, title, subtitle, filters, summary, table }: PdfTableExport) {
  // Loaded on demand — jsPDF is large and only needed when someone exports.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(title, margin, 48)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, margin, 66)
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - margin, 66, { align: "right" })

  let y = 84
  if (filters.length > 0) {
    const filterLines = doc.splitTextToSize(`Filters applied: ${filters.join(" | ")}`, pageWidth - margin * 2)
    doc.text(filterLines, margin, y)
    y += filterLines.length * 12 + 4
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [summary.head],
    body: [summary.body],
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
    bodyStyles: { fontSize: 11 },
  })

  const emptyRow = table.head.map((_, i) => (i === 1 ? table.emptyMessage : ""))
  autoTable(doc, {
    margin: { left: margin, right: margin, bottom: 40 },
    head: [table.head],
    body: table.body.length > 0 ? table.body : [emptyRow],
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: table.columnStyles,
  })

  const pageCount = doc.getNumberOfPages()
  const footerY = doc.internal.pageSize.getHeight() - 20
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" })
    doc.text("Trailhead", margin, footerY)
  }

  doc.save(filename)
}
