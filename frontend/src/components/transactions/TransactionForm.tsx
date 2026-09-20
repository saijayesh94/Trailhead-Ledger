import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Account } from "@/types/account"
import type { Owner } from "@/types/owner"
import type { Category } from "@/types/category"
import type { TransactionType } from "@/types/transaction"

export interface TransactionFormValues {
  amount: string
  type: TransactionType
  accountId: string
  ownerId: string
  categoryId: string
  description: string
  date: string
}

interface TransactionFormProps {
  accounts: Account[]
  owners: Owner[]
  categories: Category[]
  initial: TransactionFormValues
  submitLabel: string
  onSubmit: (values: TransactionFormValues) => Promise<void>
  onCancel: () => void
}

export function TransactionForm({
  accounts,
  owners,
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categoryTypeWanted = values.type === "expense" ? "expense" : "income"
  const visibleCategories = categories.filter(
    (c) => c.type === categoryTypeWanted && (c.isActive || c.id === values.categoryId)
  )
  const visibleAccounts = accounts.filter((a) => a.isActive || a.id === values.accountId)
  const visibleOwners = owners.filter((o) => o.isActive || o.id === values.ownerId)

  function update<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleTypeChange(type: TransactionType) {
    // categories are type-specific (income vs expense) — the previous
    // selection almost certainly doesn't apply to the new type
    setValues((prev) => ({ ...prev, type, categoryId: "" }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.amount || Number(values.amount) <= 0) {
      setError("Enter a valid amount")
      return
    }
    if (!values.accountId || !values.ownerId || !values.categoryId) {
      setError("Account, owner and category are required")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-amount">Amount</Label>
        <Input
          id="txn-amount"
          type="number"
          min="0"
          step="0.01"
          value={values.amount}
          onChange={(e) => update("amount", e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-type">Type</Label>
        <Select id="txn-type" value={values.type} onChange={(e) => handleTypeChange(e.target.value as TransactionType)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="received">Received</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-date">Date</Label>
        <Input id="txn-date" type="date" value={values.date} onChange={(e) => update("date", e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-account">Account</Label>
        <Select id="txn-account" value={values.accountId} onChange={(e) => update("accountId", e.target.value)}>
          <option value="" disabled>
            Select account
          </option>
          {visibleAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-owner">Owner</Label>
        <Select id="txn-owner" value={values.ownerId} onChange={(e) => update("ownerId", e.target.value)}>
          <option value="" disabled>
            Select owner
          </option>
          {visibleOwners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn-category">Category</Label>
        <Select id="txn-category" value={values.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
          <option value="" disabled>
            Select category
          </option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="col-span-2 sm:col-span-3 flex flex-col gap-1.5">
        <Label htmlFor="txn-description">Description</Label>
        <Input
          id="txn-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional"
        />
      </div>
      {error && <p className="col-span-2 sm:col-span-3 text-sm text-destructive">{error}</p>}
      <div className="col-span-2 sm:col-span-3 flex gap-2">
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
