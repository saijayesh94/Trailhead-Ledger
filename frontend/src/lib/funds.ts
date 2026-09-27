import { formatDisplayDate } from "@/lib/tableExport"
import type { FundRecord, FundInput, FundUpdate } from "@/types/fund"
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
