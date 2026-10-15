import { useEffect, useState, type ReactNode } from "react"
import { transactionsApi } from "@/services/transactions"
import { transfersApi } from "@/services/transfers"
import { accountsApi } from "@/services/accounts"
import { ownersApi } from "@/services/owners"
import { categoriesApi } from "@/services/categories"
import { getErrorMessage } from "@/services/api"
import { useLedgerPages } from "@/hooks/useLedgerPages"
import { formatCurrency } from "@/lib/currency"
import { getLastTransactionDefaults, saveLastTransactionDefaults } from "@/lib/transactionDefaults"
import { toISODate } from "@/lib/date"
import { cn } from "@/lib/utils"
import type { LedgerEntry } from "@/types/ledger"
import type { Account } from "@/types/account"
import type { Owner } from "@/types/owner"
import type { Category } from "@/types/category"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/Pagination"
import { TransactionForm, type TransactionFormValues } from "@/components/transactions/TransactionForm"
import { TransferForm, type TransferFormValues } from "@/components/transactions/TransferForm"
import { Plus, ArrowLeftRight, Pencil, Trash2, X, RotateCw } from "lucide-react"

const PAGE_SIZE = 20

// An add that's shown in the list before the server has confirmed it
interface PendingSave {
  tempId: string
  preview: LedgerEntry
  status: "saving" | "failed"
  error?: string
  save: () => Promise<LedgerEntry>
}

function toTransactionInput(values: TransactionFormValues) {
  return {
    amount: Number(values.amount),
    type: values.type,
    accountId: values.accountId,
    ownerId: values.ownerId,
    categoryId: values.categoryId,
    description: values.description || undefined,
    date: values.date,
  }
}

function toTransferInput(values: TransferFormValues) {
  return {
    amount: Number(values.amount),
    fromAccountId: values.fromAccountId,
    toAccountId: values.toAccountId,
    ownerId: values.ownerId,
    description: values.description || undefined,
    date: values.date,
  }
}

function pick<T extends { id: string }>(items: T[], id: string): T {
  // The forms only offer ids from these lists, so the lookup always hits
  return items.find((item) => item.id === id)!
}

function LedgerRow({ entry, actions, className }: { entry: LedgerEntry; actions?: ReactNode; className?: string }) {
  if (entry.kind === "transfer") {
    const t = entry.data
    return (
      <Card className={className}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Badge variant="outline" className="shrink-0">
              Transfer
            </Badge>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {t.fromAccount.name} → {t.toAccount.name}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {new Date(t.date).toLocaleDateString()} · {t.owner.name}
                {t.description ? ` · ${t.description}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <p className="font-semibold sm:text-right">{formatCurrency(t.amount, t.fromAccount.currency)}</p>
            {actions}
          </div>
        </CardContent>
      </Card>
    )
  }

  const t = entry.data
  const isExpense = t.type === "expense"
  return (
    <Card className={className}>
      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="shrink-0">
            {t.category.name}
          </Badge>
          <div className="min-w-0">
            <p className="font-medium truncate">{t.description || t.category.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {new Date(t.date).toLocaleDateString()} · {t.owner.name} · {t.account.name}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <p className={isExpense ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
            {isExpense ? "-" : "+"}
            {formatCurrency(t.amount, t.account.currency)}
          </p>
          {actions}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Transactions() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAddingTxn, setIsAddingTxn] = useState(false)
  const [isAddingTransfer, setIsAddingTransfer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingSave[]>([])

  const ledger = useLedgerPages(PAGE_SIZE)

  useEffect(() => {
    Promise.all([accountsApi.list(), ownersApi.list(), categoriesApi.list()])
      .then(([accs, ows, cats]) => {
        setAccounts(accs)
        setOwners(ows)
        setCategories(cats)
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load transactions")))
      .finally(() => setIsLoadingMasterData(false))
  }, [])

  function defaultTransactionValues(): TransactionFormValues {
    const last = getLastTransactionDefaults()
    const meOwner = owners.find((o) => o.name === "Me")
    return {
      amount: "",
      type: last.type ?? "expense",
      accountId: last.accountId ?? accounts.find((a) => a.isActive)?.id ?? "",
      ownerId: last.ownerId ?? meOwner?.id ?? owners.find((o) => o.isActive)?.id ?? "",
      categoryId: "",
      description: "",
      date: toISODate(),
    }
  }

  function updatePending(tempId: string, changes: Partial<PendingSave>) {
    setPending((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...changes } : p)))
  }

  function runSave(item: PendingSave) {
    updatePending(item.tempId, { status: "saving", error: undefined })
    item
      .save()
      .then((saved) => {
        setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))
        ledger.insertEntry(saved)
      })
      .catch((err) => updatePending(item.tempId, { status: "failed", error: getErrorMessage(err, "Could not save") }))
  }

  // Shows the entry in the list immediately and saves it in the background;
  // a failed save stays in the list with Retry/Discard so nothing is lost.
  function queueSave(preview: LedgerEntry, save: () => Promise<LedgerEntry>) {
    const item: PendingSave = { tempId: crypto.randomUUID(), preview, status: "saving", save }
    setPending((prev) => [item, ...prev])
    runSave(item)
  }

  function handleCreateTransaction(values: TransactionFormValues) {
    const input = toTransactionInput(values)
    const account = pick(accounts, input.accountId)
    const owner = pick(owners, input.ownerId)
    const category = pick(categories, input.categoryId)
    queueSave(
      {
        kind: "transaction",
        data: {
          ...input,
          id: "",
          amount: String(input.amount),
          description: input.description ?? null,
          date: `${input.date}T00:00:00.000Z`,
          account: { id: account.id, name: account.name, currency: account.currency },
          owner: { id: owner.id, name: owner.name, color: owner.color },
          category: { id: category.id, name: category.name, type: category.type },
        },
      },
      async () => ({ kind: "transaction", data: await transactionsApi.create(input) })
    )
    saveLastTransactionDefaults({ accountId: values.accountId, ownerId: values.ownerId, type: values.type })
  }

  function handleCreateTransfer(values: TransferFormValues) {
    const input = toTransferInput(values)
    const from = pick(accounts, input.fromAccountId)
    const to = pick(accounts, input.toAccountId)
    const owner = pick(owners, input.ownerId)
    queueSave(
      {
        kind: "transfer",
        data: {
          ...input,
          id: "",
          amount: String(input.amount),
          description: input.description ?? null,
          date: `${input.date}T00:00:00.000Z`,
          fromAccount: { id: from.id, name: from.name, currency: from.currency },
          toAccount: { id: to.id, name: to.name, currency: to.currency },
          owner: { id: owner.id, name: owner.name, color: owner.color },
        },
      },
      async () => ({ kind: "transfer", data: await transfersApi.create(input) })
    )
    setIsAddingTransfer(false)
  }

  async function handleUpdateTransaction(id: string, values: TransactionFormValues) {
    const updated = await transactionsApi.update(id, toTransactionInput(values))
    ledger.replaceEntry({ kind: "transaction", data: updated })
    setEditingId(null)
  }

  async function handleDeleteTransaction(entry: LedgerEntry) {
    if (!confirm("Delete this transaction?")) return
    setError(null)
    try {
      await transactionsApi.remove(entry.data.id)
      ledger.removeEntry(entry)
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete transaction"))
    }
  }

  if (isLoadingMasterData || (ledger.entries === null && !ledger.error && ledger.total === null)) {
    return <p className="text-sm text-muted-foreground">Loading transactions...</p>
  }

  const hasMasterData = accounts.length > 0 && owners.length > 0 && categories.length > 0
  const isEmpty = ledger.total === 0 && pending.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        {hasMasterData && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingTransfer((v) => !v)
                setIsAddingTxn(false)
              }}
            >
              {isAddingTransfer ? <X /> : <ArrowLeftRight />}
              {isAddingTransfer ? "Cancel" : "Transfer"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsAddingTxn((v) => !v)
                setIsAddingTransfer(false)
              }}
            >
              {isAddingTxn ? <X /> : <Plus />}
              {isAddingTxn ? "Done" : "Add Transaction"}
            </Button>
          </div>
        )}
      </div>

      {(error ?? ledger.error) && <p className="text-sm text-destructive">{error ?? ledger.error}</p>}

      {!hasMasterData && !error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Add at least one account, owner and category in Settings before recording transactions.
          </CardContent>
        </Card>
      )}

      {isAddingTxn && (
        <TransactionForm
          accounts={accounts}
          owners={owners}
          categories={categories}
          initial={defaultTransactionValues()}
          submitLabel="Save"
          onSubmit={handleCreateTransaction}
          onCancel={() => setIsAddingTxn(false)}
          keepOpen
        />
      )}

      {isAddingTransfer && (
        <TransferForm
          accounts={accounts}
          owners={owners}
          initial={{
            amount: "",
            fromAccountId: "",
            toAccountId: "",
            ownerId: owners.find((o) => o.name === "Me")?.id ?? "",
            description: "",
            date: toISODate(),
          }}
          onSubmit={handleCreateTransfer}
          onCancel={() => setIsAddingTransfer(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        {isEmpty && hasMasterData && <p className="text-sm text-muted-foreground">No transactions yet.</p>}

        {pending.map((item) => (
          <div key={item.tempId} className="flex flex-col gap-1">
            <LedgerRow
              entry={item.preview}
              className={cn(item.status === "saving" ? "opacity-60" : "border-destructive")}
              actions={
                item.status === "saving" ? (
                  <span className="text-xs text-muted-foreground">Saving…</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => runSave(item)}>
                      <RotateCw /> Retry
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Discard"
                      onClick={() => setPending((prev) => prev.filter((p) => p.tempId !== item.tempId))}
                    >
                      <X />
                    </Button>
                  </div>
                )
              }
            />
            {item.status === "failed" && <p className="text-sm text-destructive px-1">{item.error}</p>}
          </div>
        ))}

        {ledger.entries === null && !ledger.error && (
          <p className="text-sm text-muted-foreground">Loading page {ledger.page}...</p>
        )}

        {ledger.entries?.map((entry) => {
          if (entry.kind === "transaction" && editingId === entry.data.id) {
            const t = entry.data
            return (
              <TransactionForm
                key={`txn-${t.id}`}
                accounts={accounts}
                owners={owners}
                categories={categories}
                initial={{
                  amount: t.amount,
                  type: t.type,
                  accountId: t.accountId,
                  ownerId: t.ownerId,
                  categoryId: t.categoryId,
                  description: t.description ?? "",
                  date: t.date.slice(0, 10),
                }}
                submitLabel="Save changes"
                onSubmit={(values) => handleUpdateTransaction(t.id, values)}
                onCancel={() => setEditingId(null)}
              />
            )
          }

          return (
            <LedgerRow
              key={`${entry.kind}-${entry.data.id}`}
              entry={entry}
              actions={
                entry.kind === "transaction" && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditingId(entry.data.id)}>
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      onClick={() => handleDeleteTransaction(entry)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )
              }
            />
          )
        })}
      </div>

      <Pagination
        page={ledger.page}
        pageCount={ledger.pageCount}
        onChange={(p) => {
          ledger.setPage(p)
          window.scrollTo({ top: 0 })
        }}
      />
    </div>
  )
}
