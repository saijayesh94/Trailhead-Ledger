import { formatDisplayDate } from "@/lib/tableExport"
import type { FundEntry, FundRecord, FundInput, FundUpdate } from "@/types/fund"
import type { FundFormValues } from "@/components/funds/FundForm"

// Fund dates are stored as midnight UTC; the first 10 chars are the calendar date.
export function fundDate(iso: string): string {
  return iso.slice(0, 10)
}

export function formatFundDateRange(fund: Pick<FundRecord, "startDate" | "endDate">): string {
  const start = formatDisplayDate(fundDate(fund.startDate))
  return fund.endDate ? `${start} – ${formatDisplayDate(fundDate(fund.endDate))}` : `From ${start}`
}

export function fundToFormValues(fund: FundRecord): FundFormValues {
  return {
    name: fund.name,
    description: fund.description ?? "",
    budget: fund.budget ? String(Number(fund.budget)) : "",
    startDate: fundDate(fund.startDate),
    endDate: fund.endDate ? fundDate(fund.endDate) : "",
  }
}

// Empty optional fields: omitted when creating, null when updating so an edit
// can clear a budget, end date or description that was set before.
export function formValuesToCreateInput(values: FundFormValues): FundInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    budget: values.budget ? Number(values.budget) : undefined,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
  }
}

export function formValuesToUpdateInput(values: FundFormValues): FundUpdate {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    budget: values.budget ? Number(values.budget) : null,
    startDate: values.startDate,
    endDate: values.endDate || null,
  }
}

// Category for money spent, source ("Dad", "My savings") for money received
export function fundEntryLabel(entry: FundEntry): string {
  return entry.kind === "spent" ? entry.data.category.name : entry.data.source
}

// The expense description or the deposit note
export function fundEntryNote(entry: FundEntry): string | null {
  return entry.kind === "spent" ? entry.data.description : entry.data.note
}

// Received counts up, spent counts down
export function fundEntrySignedAmount(entry: FundEntry): number {
  const amount = Number(entry.data.amount)
  return entry.kind === "spent" ? -amount : amount
}
