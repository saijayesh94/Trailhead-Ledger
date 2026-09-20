import { z } from 'zod'

export const categoryTypeSchema = z.enum(['income', 'expense'])

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  type: categoryTypeSchema,
  icon: z.string().trim().max(50).optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: categoryTypeSchema.optional(),
  icon: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
