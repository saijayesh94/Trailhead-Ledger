import { useId, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { getErrorMessage } from "@/services/api"
import { PAYMENT_METHODS } from "@/lib/paymentMethods"
import type { FundCategory, FundEntry, PaymentMethod } from "@/types/fund"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Plus } from "lucide-react"

export interface FundEntryFormValues {
  kind: FundEntry["kind"]
  amount: string
  // Spent entries only
  fundCategoryId: string
  // Received entries only: who the money came from
  source: string
  paymentMethod: PaymentMethod
  // The expense description, or the deposit note
  description: string
  date: string
}

interface FundEntryFormProps {
  categories: FundCategory[]
  sources: string[]
  initial: FundEntryFormValues
  submitLabel: string
  onSubmit: (values: FundEntryFormValues) => Promise<void>
  onCancel?: () => void
  // Received/Spent can't change on edit: they're stored separately
  lockKind?: boolean
  // Quick-add mode: after saving, clear amount + description but keep the
  // rest, and put the cursor back on amount.
  keepOpen?: boolean
}

export function FundEntryForm({
  categories,
  sources,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  lockKind = false,
  keepOpen = false,
}: FundEntryFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const sourcesListId = useId()

  const isSpent = values.kind === "spent"
  const visibleCategories = categories.filter((c) => c.isActive || c.id === values.fundCategoryId)

  function update<K extends keyof FundEntryFormValues>(key: K, value: FundEntryFormValues[K]) {
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
    if (isSpent && !values.fundCategoryId) {
      setError("Pick a category")
      return
    }
    if (!isSpent && !values.source.trim()) {
      setError("Who is the money from? e.g. Dad, My savings")
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
      setError(getErrorMessage(err, "Could not save entry"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[7.5rem_8rem_1fr_1fr_2fr_9.5rem_auto] gap-2">
        <Select
          aria-label="Type"
          value={values.kind}
          disabled={lockKind}
          onChange={(e) => update("kind", e.target.value as FundEntry["kind"])}
        >
          <option value="spent">Spent</option>
          <option value="received">Received</option>
        </Select>
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
          autoFocus
        />
        {isSpent ? (
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
        ) : (
          <>
            <Input
              list={sourcesListId}
              placeholder="From (e.g. Dad, My savings)"
              aria-label="Source"
              value={values.source}
              onChange={(e) => update("source", e.target.value)}
            />
            <datalist id={sourcesListId}>
              {sources.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}
        <Select
          aria-label={isSpent ? "Paid via" : "Received via"}
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
          placeholder={isSpent ? "What for? (optional)" : "Note (optional)"}
          aria-label={isSpent ? "Description" : "Note"}
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
      {isSpent && visibleCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active fund categories.{" "}
          <Link to="/settings" className="underline">
            Add one in Settings
          </Link>{" "}
          to record spending.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
