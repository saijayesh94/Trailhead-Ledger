import { z } from 'zod'

export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'received']),
  description: z.string().trim().max(500).optional(),
  date: z.coerce.date(),
  accountId: z.string().min(1),
  ownerId: z.string().min(1),
  categoryId: z.string().min(1),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
