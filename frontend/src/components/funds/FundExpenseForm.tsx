import { useRef, useState, type FormEvent } from "react"
import { getErrorMessage } from "@/services/api"
import { PAYMENT_METHODS } from "@/lib/paymentMethods"
import type { FundCategory, PaymentMethod } from "@/types/fund"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Plus } from "lucide-react"

export interface FundExpenseFormValues {
  amount: string
  fundCategoryId: string
  paymentMethod: PaymentMethod
  description: string
  date: string
}

interface FundExpenseFormProps {
  categories: FundCategory[]
  initial: FundExpenseFormValues
  submitLabel: string
  onSubmit: (values: FundExpenseFormValues) => Promise<void>
  onCancel?: () => void
  // Quick-add mode: after saving, clear amount + description but keep the
  // category, payment method and date, and put the cursor back on amount.
  keepOpen?: boolean
}

export function FundExpenseForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  keepOpen = false,
}: FundExpenseFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const visibleCategories = categories.filter((c) => c.isActive || c.id === values.fundCategoryId)

  function update<K extends keyof FundExpenseFormValues>(key: K, value: FundExpenseFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.amount || Number(values.amount) <= 0) {
      setError("Enter a valid amount")
      amountRef.current?.focus()
      return
    }
    if (!values.fundCategoryId) {
      setError("Pick a category")
      return
    }
    if (!values.date) {
      setError("Date is required")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      if (keepOpen) {
        setValues((prev) => ({ ...prev, amount: "", description: "" }))
        amountRef.current?.focus()
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not save expense"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 md:grid-cols-[8rem_1fr_1fr_2fr_9.5rem_auto] gap-2">
        <Input
          ref={amountRef}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Amount"
          aria-label="Amount"
          value={values.amount}
          onChange={(e) => update("amount", e.target.value)}
          // Not for quick-add: it's on screen at page load, and focusing it
          // would pop the keyboard open on phones before the user asks.
          autoFocus={!keepOpen}
        />
        <Select
          aria-label="Category"
          value={values.fundCategoryId}
          onChange={(e) => update("fundCategoryId", e.target.value)}
        >
          <option value="" disabled>
            Category
          </option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Paid via"
          value={values.paymentMethod}
          onChange={(e) => update("paymentMethod", e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="What for? (optional)"
          aria-label="Description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <Input type="date" aria-label="Date" value={values.date} onChange={(e) => update("date", e.target.value)} />
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {keepOpen && <Plus />}
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
