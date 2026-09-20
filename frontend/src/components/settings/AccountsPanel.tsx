import { useEffect, useState } from "react"
import { accountsApi } from "@/services/accounts"
import { getErrorMessage } from "@/services/api"
import type { Account } from "@/types/account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus, X } from "lucide-react"

const ACCOUNT_TYPE_SUGGESTIONS = ["Savings", "Current", "Cash", "Credit Card", "UPI Wallet"]

export default function AccountsPanel() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newBankName, setNewBankName] = useState("")
  const [newType, setNewType] = useState("Savings")
  const [newCurrency, setNewCurrency] = useState("INR")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editBankName, setEditBankName] = useState("")
  const [editType, setEditType] = useState("Savings")

  useEffect(() => {
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setError(getErrorMessage(err, "Could not load accounts")))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd() {
    if (!newName.trim() || !newType.trim()) return
    setError(null)
    try {
      const account = await accountsApi.create({
        name: newName.trim(),
        bankName: newBankName.trim() || undefined,
        type: newType.trim(),
        currency: newCurrency.trim() || undefined,
      })
      setAccounts((prev) => [...prev, account])
      setNewName("")
      setNewBankName("")
      setIsAdding(false)
    } catch (err) {
      setError(getErrorMessage(err, "Could not create account"))
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id)
    setEditName(account.name)
    setEditBankName(account.bankName ?? "")
    setEditType(account.type)
  }

  async function handleSaveEdit(id: string) {
    setError(null)
    try {
      const updated = await accountsApi.update(id, {
        name: editName.trim(),
        bankName: editBankName.trim() || undefined,
        type: editType.trim(),
      })
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)))
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, "Could not update account"))
    }
  }

  async function handleToggleActive(account: Account) {
    setError(null)
    try {
      const updated = await accountsApi.update(account.id, { isActive: !account.isActive })
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update account"))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return
    setError(null)
    try {
      await accountsApi.remove(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete account"))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading accounts...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Accounts</CardTitle>
        <Button size="sm" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? <X /> : <Plus />}
          {isAdding ? "Cancel" : "Add account"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isAdding && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-account-name">Name</Label>
              <Input
                id="new-account-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. BOB"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-account-bank">Bank (optional)</Label>
              <Input
                id="new-account-bank"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g. Bank of Baroda"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-account-type">Type</Label>
              <Input
                id="new-account-type"
                list="account-type-suggestions"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <datalist id="account-type-suggestions">
                {ACCOUNT_TYPE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-account-currency">Currency</Label>
              <Input
                id="new-account-currency"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <Button onClick={handleAdd} className="col-span-2">
              Save
            </Button>
          </div>
        )}

        {accounts.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No accounts yet. Add your first bank account.</p>
        )}

        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between gap-2 rounded-md border p-3"
          >
            {editingId === account.id ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                  <Input
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="Bank"
                  />
                  <Input
                    list="account-type-suggestions"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    placeholder="Type"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(account.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={account.isActive ? "" : "text-muted-foreground line-through"}>
                    {account.name}
                  </span>
                  {account.bankName && (
                    <span className="text-sm text-muted-foreground">{account.bankName}</span>
                  )}
                  <Badge variant="outline">{account.type}</Badge>
                  <Badge variant="outline">{account.currency}</Badge>
                  {account.isDefault && <Badge>Default</Badge>}
                  {!account.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(account)}>
                    {account.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(account)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(account.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
