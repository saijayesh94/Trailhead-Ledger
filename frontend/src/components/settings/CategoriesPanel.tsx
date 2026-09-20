import { useEffect, useState } from "react"
import { categoriesApi } from "@/services/categories"
import { getErrorMessage } from "@/services/api"
import type { Category, CategoryType } from "@/types/category"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const selectClass =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<CategoryType>("expense")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState<CategoryType>("expense")

  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err, "Could not load categories")))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setError(null)
    try {
      const category = await categoriesApi.create({ name: newName.trim(), type: newType })
      setCategories((prev) => [...prev, category])
      setNewName("")
      setIsAdding(false)
    } catch (err) {
      setError(getErrorMessage(err, "Could not create category"))
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditType(category.type)
  }

  async function handleSaveEdit(id: string) {
    setError(null)
    try {
      const updated = await categoriesApi.update(id, { name: editName.trim(), type: editType })
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setEditingId(null)
    } catch (err) {
      setError(getErrorMessage(err, "Could not update category"))
    }
  }

  async function handleToggleActive(category: Category) {
    setError(null)
    try {
      const updated = await categoriesApi.update(category.id, { isActive: !category.isActive })
      setCategories((prev) => prev.map((c) => (c.id === category.id ? updated : c)))
    } catch (err) {
      setError(getErrorMessage(err, "Could not update category"))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return
    setError(null)
    try {
      await categoriesApi.remove(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete category"))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading categories...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Categories</CardTitle>
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
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Groceries"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-category-type">Type</Label>
              <select
                id="new-category-type"
                className={selectClass}
                value={newType}
                onChange={(e) => setNewType(e.target.value as CategoryType)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <Button onClick={handleAdd}>Save</Button>
          </div>
        )}

        {categories.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No categories yet. Add one to get started.</p>
        )}

        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border p-3"
          >
            {editingId === category.id ? (
              <>
                <div className="flex items-center gap-2 sm:flex-1">
                  <select
                    className={selectClass}
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as CategoryType)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
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
                  <Badge
                    variant="outline"
                    className={cn(
                      category.type === "income" ? "text-green-600 border-green-600/30" : "text-red-600 border-red-600/30"
                    )}
                  >
                    {category.type}
                  </Badge>
                  {category.isDefault && <Badge>Default</Badge>}
                  {!category.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex gap-1 self-end sm:self-auto">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(category)}>
                    {category.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(category)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(category.id)}>
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
