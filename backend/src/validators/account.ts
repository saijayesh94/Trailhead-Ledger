import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(50),
  bankName: z.string().trim().max(100).optional(),
  type: z.string().trim().min(1).max(30),
  currency: z.string().trim().length(3).toUpperCase().optional(),
})

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  bankName: z.string().trim().max(100).optional(),
  type: z.string().trim().min(1).max(30).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  isActive: z.boolean().optional(),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
