import { z } from 'zod'

export const createTransferSchema = z
  .object({
    amount: z.number().positive(),
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    ownerId: z.string().min(1),
    description: z.string().trim().max(500).optional(),
    date: z.coerce.date(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'From and To accounts must be different',
    path: ['toAccountId'],
  })

export type CreateTransferInput = z.infer<typeof createTransferSchema>
