import { useId, useState, type FormEvent } from "react"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { toISODate } from "@/lib/date"
import { formatDisplayDate } from "@/lib/tableExport"
import { fundDate } from "@/lib/funds"
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/paymentMethods"
import type { FundDeposit, FundDepositInput, PaymentMethod } from "@/types/fund"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Pencil, Plus, Trash2, X } from "lucide-react"

interface DepositFormValues {
  amount: string
  source: string
  paymentMethod: PaymentMethod
  date: string
  note: string
}

function DepositForm({
  initial,
  sources,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: DepositFormValues
  sources: string[]
  submitLabel: string
  onSubmit: (values: DepositFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sourcesListId = useId()

  function update<K extends keyof DepositFormValues>(key: K, value: DepositFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.amount || Number(values.amount) <= 0) {
      setError("Enter a valid amount")
      return
    }
    if (!values.source.trim()) {
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
    } catch (err) {
      setError(getErrorMessage(err, "Could not save deposit"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border p-3">
      <div className="grid grid-cols-2 md:grid-cols-[8rem_1fr_1fr_9.5rem] gap-2">
        <Input
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
        <Select
          aria-label="Received via"
          value={values.paymentMethod}
          onChange={(e) => update("paymentMethod", e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Input type="date" aria-label="Date" value={values.date} onChange={(e) => update("date", e.target.value)} />
        <Input
          className="col-span-2 md:col-span-4"
          placeholder="Note (optional)"
          aria-label="Note"
          value={values.note}
          onChange={(e) => update("note", e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
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

function toInput(values: DepositFormValues): FundDepositInput {
  return {
    amount: Number(values.amount),
    source: values.source.trim(),
    paymentMethod: values.paymentMethod,
    date: values.date,
    note: values.note.trim() || undefined,
  }
}

interface FundDepositsProps {
  deposits: FundDeposit[]
  sources: string[]
  canAdd: boolean
  onCreate: (input: FundDepositInput) => Promise<void>
  onUpdate: (id: string, input: FundDepositInput) => Promise<void>
  onDelete: (deposit: FundDeposit) => Promise<void>
}

export function FundDeposits({ deposits, sources, canAdd, onCreate, onUpdate, onDelete }: FundDepositsProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle>Money In</CardTitle>
          <p className="text-sm text-muted-foreground">
            Money given or set aside for this fund. Leave empty if you're only tracking spending.
          </p>
        </div>
        {canAdd && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAdding((v) => !v)
              setEditingId(null)
            }}
          >
            {isAdding ? <X /> : <Plus />}
            {isAdding ? "Cancel" : "Add money"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isAdding && (
          <DepositForm
            initial={{ amount: "", source: "", paymentMethod: "upi", date: toISODate(), note: "" }}
            sources={sources}
            submitLabel="Add"
            onSubmit={async (values) => {
              await onCreate(toInput(values))
              setIsAdding(false)
            }}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {deposits.length === 0 && !isAdding && <p className="text-sm text-muted-foreground">No money added yet.</p>}

        {deposits.map((deposit) =>
          editingId === deposit.id ? (
            <DepositForm
              key={deposit.id}
              initial={{
                amount: String(Number(deposit.amount)),
                source: deposit.source,
                paymentMethod: deposit.paymentMethod,
                date: fundDate(deposit.date),
                note: deposit.note ?? "",
              }}
              sources={sources}
              submitLabel="Save"
              onSubmit={async (values) => {
                await onUpdate(deposit.id, toInput(values))
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={deposit.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{deposit.source}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDisplayDate(fundDate(deposit.date))} · {paymentMethodLabel(deposit.paymentMethod)}
                  {deposit.note ? ` · ${deposit.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-semibold text-green-600 mr-1">{formatCurrency(deposit.amount, "INR")}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit deposit"
                  onClick={() => {
                    setEditingId(deposit.id)
                    setIsAdding(false)
                  }}
                >
                  <Pencil />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Delete deposit" onClick={() => onDelete(deposit)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          )
        )}

        {deposits.length > 1 && (
          <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
            <span>Total received</span>
            <span>{formatCurrency(total, "INR")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
