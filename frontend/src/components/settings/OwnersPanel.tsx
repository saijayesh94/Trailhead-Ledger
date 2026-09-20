import { useEffect, useState } from "react"
import { ownersApi } from "@/services/owners"
import { getErrorMessage } from "@/services/api"
import type { Owner } from "@/types/owner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus, X } from "lucide-react"

export default function OwnersPanel() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#2563eb")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("#2563eb")

  useEffect(() => {
    ownersApi
      .list()
      .then(setOwners)
      .catch((err) => setError(getErrorMessage(err, "Could not load owners")))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setError(null)
    try {
      const owner = await ownersApi.create({ name: newName.trim(), color: newColor })
      setOwners((prev) => [...prev, owner])
      setNewName("")
      setIsAdding(false)
    } catch (err) {
      setError(getErrorMessage(err, "Could not create owner"))
    }
  }

  function startEdit(owner: Owner) {
    setEditingId(owner.id)
    setEditName(owner.name)
    setEditColor(owner.color ?? "#2563eb")
  }

  async function handleSaveEdit(id: string) {
    setError(null)
    try {
      const updated = await ownersApi.update(id, { name: editName.trim(), color: editColor })
      setOwners((prev) => prev.map((o) => (o.id === id ? updated : o)))
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, "Could not update owner"))
    }
  }

  async function handleToggleActive(owner: Owner) {
    setError(null)
    try {
      const updated = await ownersApi.update(owner.id, { isActive: !owner.isActive })
      setOwners((prev) => prev.map((o) => (o.id === owner.id ? updated : o)))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update owner"))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this owner?")) return
    setError(null)
    try {
      await ownersApi.remove(id)
      setOwners((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete owner"))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading owners...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Owners</CardTitle>
        <Button size="sm" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? <X /> : <Plus />}
          {isAdding ? "Cancel" : "Add owner"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isAdding && (
          <div className="flex items-end gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="new-owner-name">Name</Label>
              <Input
                id="new-owner-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Dad"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-owner-color">Color</Label>
              <input
                id="new-owner-color"
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-12 rounded-md border border-input"
              />
            </div>
            <Button onClick={handleAdd}>Save</Button>
          </div>
        )}

        {owners.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No owners yet. Add one to get started.</p>
        )}

        {owners.map((owner) => (
          <div
            key={owner.id}
            className="flex items-center justify-between gap-2 rounded-md border p-3"
          >
            {editingId === owner.id ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-9 w-12 rounded-md border border-input"
                  />
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(owner.id)}>
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
                  <span
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: owner.color ?? "#999" }}
                  />
                  <span className={owner.isActive ? "" : "text-muted-foreground line-through"}>
                    {owner.name}
                  </span>
                  {owner.isDefault && <Badge>Default</Badge>}
                  {!owner.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(owner)}>
                    {owner.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(owner)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(owner.id)}>
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
