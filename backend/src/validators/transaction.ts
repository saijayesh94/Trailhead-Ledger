import { z } from 'zod'

export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'received']),
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
  accountId: z.string().cuid(),
  ownerId: z.string().cuid(),
  categoryId: z.string().cuid(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
