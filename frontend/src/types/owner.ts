export interface Owner {
  id: string
  name: string
  color: string | null
  isDefault: boolean
  isActive: boolean
}

export interface OwnerInput {
  name: string
  color?: string
}

export interface OwnerUpdate {
  name?: string
  color?: string
  isActive?: boolean
}
