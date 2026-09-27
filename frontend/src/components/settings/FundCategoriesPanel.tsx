import { useEffect, useState } from "react"
import { fundCategoriesApi } from "@/services/fundCategories"
import { getErrorMessage } from "@/services/api"
import type { FundCategory } from "@/types/fund"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Categories for Funds only — kept separate from the main ledger's categories.
export default function FundCategoriesPanel() {
  const [categories, setCategories] = useState<FundCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  useEffect(() => {
    fundCategoriesApi
      .list()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err, "Could not load fund categories")))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setError(null)
    try {
      const category = await fundCategoriesApi.create({ name: newName.trim() })
      setCategories((prev) => [...prev, category])
      setNewName("")
      setIsAdding(false)
    } catch (err) {
      setError(getErrorMessage(err, "Could not create fund category"))
    }
  }

  function startEdit(category: FundCategory) {
    setEditingId(category.id)
    setEditName(category.name)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    setError(null)
    try {
      const updated = await fundCategoriesApi.update(id, { name: editName.trim() })
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, "Could not update fund category"))
    }
  }

  async function handleToggleActive(category: FundCategory) {
    setError(null)
    try {
      const updated = await fundCategoriesApi.update(category.id, { isActive: !category.isActive })
      setCategories((prev) => prev.map((c) => (c.id === category.id ? updated : c)))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update fund category"))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fund category?")) return
    setError(null)
    try {
      await fundCategoriesApi.remove(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete fund category"))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading fund categories...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle>Fund Categories</CardTitle>
          <p className="text-sm text-muted-foreground">Used only for expenses inside Funds.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? <X /> : <Plus />}
          {isAdding ? "Cancel" : "Add category"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isAdding && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1.5 sm:flex-1">
              <Label htmlFor="new-fund-category-name">Name</Label>
              <Input
                id="new-fund-category-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Decorations"
              />
            </div>
            <Button onClick={handleAdd}>Save</Button>
          </div>
        )}

        {categories.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No fund categories yet. Add one to get started.</p>
        )}

        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border p-3"
          >
            {editingId === category.id ? (
              <>
                <Input
                  className="sm:flex-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(category.id)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(category.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className={cn("truncate", category.isActive ? "" : "text-muted-foreground line-through")}>
                    {category.name}
                  </span>
                  {category.isDefault && <Badge>Default</Badge>}
                  {!category.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex gap-1 self-end sm:self-auto">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(category)}>
                    {category.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Rename" onClick={() => startEdit(category)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => handleDelete(category.id)}>
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
