import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Account } from "@/types/account"
import type { Owner } from "@/types/owner"

export interface TransferFormValues {
  amount: string
  fromAccountId: string
  toAccountId: string
  ownerId: string
  description: string
  date: string
}

interface TransferFormProps {
  accounts: Account[]
  owners: Owner[]
  initial: TransferFormValues
  onSubmit: (values: TransferFormValues) => Promise<void>
  onCancel: () => void
}

export function TransferForm({ accounts, owners, initial, onSubmit, onCancel }: TransferFormProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeAccounts = accounts.filter((a) => a.isActive)
  const activeOwners = owners.filter((o) => o.isActive)

  function update<K extends keyof TransferFormValues>(key: K, value: TransferFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.amount || Number(values.amount) <= 0) {
      setError("Enter a valid amount")
      return
    }
    if (!values.fromAccountId || !values.toAccountId || !values.ownerId) {
      setError("From account, to account and owner are required")
      return
    }
    if (values.fromAccountId === values.toAccountId) {
      setError("From and To accounts must be different")
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-amount">Amount</Label>
        <Input
          id="transfer-amount"
          type="number"
          min="0"
          step="0.01"
          value={values.amount}
          onChange={(e) => update("amount", e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-from">From Account</Label>
        <Select id="transfer-from" value={values.fromAccountId} onChange={(e) => update("fromAccountId", e.target.value)}>
          <option value="" disabled>
            Select account
          </option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-to">To Account</Label>
        <Select id="transfer-to" value={values.toAccountId} onChange={(e) => update("toAccountId", e.target.value)}>
          <option value="" disabled>
            Select account
          </option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-owner">Owner</Label>
        <Select id="transfer-owner" value={values.ownerId} onChange={(e) => update("ownerId", e.target.value)}>
          <option value="" disabled>
            Select owner
          </option>
          {activeOwners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-date">Date</Label>
        <Input id="transfer-date" type="date" value={values.date} onChange={(e) => update("date", e.target.value)} />
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
        <Label htmlFor="transfer-description">Description</Label>
        <Input
          id="transfer-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional"
        />
      </div>
      {error && (
        <p className="col-span-1 sm:col-span-2 md:col-span-3 text-sm text-destructive">{error}</p>
      )}
      <div className="col-span-1 sm:col-span-2 md:col-span-3 flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Transfer"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
