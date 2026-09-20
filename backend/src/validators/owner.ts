import { z } from 'zod'

const hexColor = z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color')

export const createOwnerSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: hexColor.optional(),
})

export const updateOwnerSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: hexColor.optional(),
  isActive: z.boolean().optional(),
})
