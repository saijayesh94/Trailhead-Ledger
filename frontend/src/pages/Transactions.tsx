import { useEffect, useMemo, useState } from "react"
import { transactionsApi } from "@/services/transactions"
import { transfersApi } from "@/services/transfers"
import { accountsApi } from "@/services/accounts"
import { ownersApi } from "@/services/owners"
import { categoriesApi } from "@/services/categories"
import { getErrorMessage } from "@/services/api"
import { formatCurrency } from "@/lib/currency"
import { getLastTransactionDefaults, saveLastTransactionDefaults } from "@/lib/transactionDefaults"
import type { Transaction } from "@/types/transaction"
import type { Transfer } from "@/types/transfer"
import type { Account } from "@/types/account"
import type { Owner } from "@/types/owner"
import type { Category } from "@/types/category"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TransactionForm, type TransactionFormValues } from "@/components/transactions/TransactionForm"
import { TransferForm, type TransferFormValues } from "@/components/transactions/TransferForm"
import { Plus, ArrowLeftRight, Pencil, Trash2, X } from "lucide-react"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

type LedgerEntry =
  | { kind: "transaction"; date: string; data: Transaction }
  | { kind: "transfer"; date: string; data: Transfer }

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAddingTxn, setIsAddingTxn] = useState(false)
  const [isAddingTransfer, setIsAddingTransfer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      transactionsApi.list(),
      transfersApi.list(),
      accountsApi.list(),
      ownersApi.list(),
      categoriesApi.list(),
    ])
      .then(([txns, trns, accs, ows, cats]) => {
        setTransactions(txns)
        setTransfers(trns)
        setAccounts(accs)
        setOwners(ows)
        setCategories(cats)
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load transactions")))
      .finally(() => setIsLoading(false))
  }, [])

  const ledger = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [
      ...transactions.map((t) => ({ kind: "transaction" as const, date: t.date, data: t })),
      ...transfers.map((t) => ({ kind: "transfer" as const, date: t.date, data: t })),
    ]
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, transfers])

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
      date: todayISO(),
    }
  }

  async function handleCreateTransaction(values: TransactionFormValues) {
    const created = await transactionsApi.create({
      amount: Number(values.amount),
      type: values.type,
      accountId: values.accountId,
      ownerId: values.ownerId,
      categoryId: values.categoryId,
      description: values.description || undefined,
      date: values.date,
    })
    setTransactions((prev) => [created, ...prev])
    saveLastTransactionDefaults({ accountId: values.accountId, ownerId: values.ownerId, type: values.type })
    setIsAddingTxn(false)
  }

  async function handleUpdateTransaction(id: string, values: TransactionFormValues) {
    const updated = await transactionsApi.update(id, {
      amount: Number(values.amount),
      type: values.type,
      accountId: values.accountId,
      ownerId: values.ownerId,
      categoryId: values.categoryId,
      description: values.description || undefined,
      date: values.date,
    })
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    setEditingId(null)
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("Delete this transaction?")) return
    await transactionsApi.remove(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleCreateTransfer(values: TransferFormValues) {
    const created = await transfersApi.create({
      amount: Number(values.amount),
      fromAccountId: values.fromAccountId,
      toAccountId: values.toAccountId,
      ownerId: values.ownerId,
      description: values.description || undefined,
      date: values.date,
    })
    setTransfers((prev) => [created, ...prev])
    setIsAddingTransfer(false)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading transactions...</p>

  const hasMasterData = accounts.length > 0 && owners.length > 0 && categories.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        {hasMasterData && (
          <div className="flex gap-2">
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
              {isAddingTxn ? "Cancel" : "Add Transaction"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
            date: todayISO(),
          }}
          onSubmit={handleCreateTransfer}
          onCancel={() => setIsAddingTransfer(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        {ledger.length === 0 && hasMasterData && (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        )}

        {ledger.map((entry) => {
          if (entry.kind === "transfer") {
            const t = entry.data
            return (
              <Card key={`transfer-${t.id}`}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Transfer</Badge>
                    <div>
                      <p className="font-medium">
                        {t.fromAccount.name} → {t.toAccount.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()} · {t.owner.name}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(t.amount, t.fromAccount.currency)}</p>
                </CardContent>
              </Card>
            )
          }

          const t = entry.data

          if (editingId === t.id) {
            return (
              <TransactionForm
                key={t.id}
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

          const isExpense = t.type === "expense"
          return (
            <Card key={`txn-${t.id}`}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{t.category.name}</Badge>
                  <div>
                    <p className="font-medium">{t.description || t.category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(t.date).toLocaleDateString()} · {t.owner.name} · {t.account.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={isExpense ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                    {isExpense ? "-" : "+"}
                    {formatCurrency(t.amount, t.account.currency)}
                  </p>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(t.id)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteTransaction(t.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
