import { z } from 'zod'

export const paymentMethodSchema = z.enum(['cash', 'upi', 'card', 'bank', 'other'])

const amount = z.number().positive()
const money = z.number().positive().nullable()

export const createFundSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    budget: money.optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .refine((f) => !f.endDate || f.endDate >= f.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  })

export const updateFundSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  budget: money.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.enum(['active', 'closed']).optional(),
})

export const createFundDepositSchema = z.object({
  amount,
  date: z.coerce.date(),
  source: z.string().trim().min(1).max(100),
  paymentMethod: paymentMethodSchema,
  note: z.string().trim().max(500).optional(),
})

export const updateFundDepositSchema = createFundDepositSchema.partial()

export const createFundExpenseSchema = z.object({
  amount,
  date: z.coerce.date(),
  fundCategoryId: z.string().min(1),
  paymentMethod: paymentMethodSchema,
  description: z.string().trim().max(500).optional(),
})

export const updateFundExpenseSchema = createFundExpenseSchema.partial()

export const createFundCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  icon: z.string().trim().max(50).optional(),
})

export const updateFundCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional(),
})

export type CreateFundInput = z.infer<typeof createFundSchema>
export type UpdateFundInput = z.infer<typeof updateFundSchema>
export type CreateFundDepositInput = z.infer<typeof createFundDepositSchema>
export type UpdateFundDepositInput = z.infer<typeof updateFundDepositSchema>
export type CreateFundExpenseInput = z.infer<typeof createFundExpenseSchema>
export type UpdateFundExpenseInput = z.infer<typeof updateFundExpenseSchema>
export type CreateFundCategoryInput = z.infer<typeof createFundCategorySchema>
export type UpdateFundCategoryInput = z.infer<typeof updateFundCategorySchema>
