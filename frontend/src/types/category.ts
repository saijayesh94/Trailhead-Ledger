export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  isDefault: boolean
  isActive: boolean
}

export interface CategoryInput {
  name: string
  type: CategoryType
  icon?: string
}

export interface CategoryUpdate {
  name?: string
  type?: CategoryType
  icon?: string
  isActive?: boolean
}
