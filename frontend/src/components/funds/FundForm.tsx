import { useState, type FormEvent } from "react"
import { getErrorMessage } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface FundFormValues {
  name: string
  description: string
  budget: string
  startDate: string
  endDate: string
}

interface FundFormProps {
  initial: FundFormValues
  submitLabel: string
  onSubmit: (values: FundFormValues) => Promise<void>
  onCancel: () => void
}

export function FundForm({ initial, submitLabel, onSubmit, onCancel }: FundFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update<K extends keyof FundFormValues>(key: K, value: FundFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError("Give the fund a name")
      return
    }
    if (values.budget && Number(values.budget) <= 0) {
      setError("Budget must be more than zero, or left empty")
      return
    }
    if (!values.startDate) {
      setError("Start date is required")
      return
    }
    if (values.endDate && values.endDate < values.startDate) {
      setError("End date cannot be before start date")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(getErrorMessage(err, "Could not save fund"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 rounded-md border p-3">
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="fund-name">Name</Label>
        <Input
          id="fund-name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Goa Trip, Cousin's Wedding"
          autoFocus
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="fund-budget">Budget</Label>
        <Input
          id="fund-budget"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values.budget}
          onChange={(e) => update("budget", e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="sm:col-span-1 md:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="fund-start">Start date</Label>
        <Input
          id="fund-start"
          type="date"
          value={values.startDate}
          onChange={(e) => update("startDate", e.target.value)}
        />
      </div>
      <div className="sm:col-span-1 md:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="fund-end">End date</Label>
        <Input
          id="fund-end"
          type="date"
          value={values.endDate}
          min={values.startDate || undefined}
          onChange={(e) => update("endDate", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 md:col-span-4 flex flex-col gap-1.5">
        <Label htmlFor="fund-description">Description</Label>
        <Input
          id="fund-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional"
        />
      </div>
      {error && <p className="sm:col-span-2 md:col-span-4 text-sm text-destructive">{error}</p>}
      <div className="sm:col-span-2 md:col-span-4 flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
