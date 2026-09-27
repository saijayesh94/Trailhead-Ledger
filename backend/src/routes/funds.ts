import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import {
  listFunds,
  getFund,
  createFund,
  updateFund,
  deleteFund,
  listDepositSources,
  createFundDeposit,
  updateFundDeposit,
  deleteFundDeposit,
  createFundExpense,
  updateFundExpense,
  deleteFundExpense,
} from '../controllers/fund.controller'
import {
  createFundSchema,
  updateFundSchema,
  createFundDepositSchema,
  updateFundDepositSchema,
  createFundExpenseSchema,
  updateFundExpenseSchema,
} from '../validators/fund'
import type { Env, Variables } from '../types'

const funds = new Hono<{ Bindings: Env; Variables: Variables }>()

funds.get('/', authMiddleware, listFunds)
funds.post('/', validateInput(createFundSchema), authMiddleware, createFund)
// Registered before /:id so "deposit-sources" isn't captured as a fund id
funds.get('/deposit-sources', authMiddleware, listDepositSources)
funds.get('/:id', authMiddleware, getFund)
funds.patch('/:id', validateInput(updateFundSchema), authMiddleware, updateFund)
funds.delete('/:id', authMiddleware, deleteFund)

funds.post('/:id/deposits', validateInput(createFundDepositSchema), authMiddleware, createFundDeposit)
funds.patch('/:id/deposits/:depositId', validateInput(updateFundDepositSchema), authMiddleware, updateFundDeposit)
funds.delete('/:id/deposits/:depositId', authMiddleware, deleteFundDeposit)

funds.post('/:id/expenses', validateInput(createFundExpenseSchema), authMiddleware, createFundExpense)
funds.patch('/:id/expenses/:expenseId', validateInput(updateFundExpenseSchema), authMiddleware, updateFundExpense)
funds.delete('/:id/expenses/:expenseId', authMiddleware, deleteFundExpense)

export default funds
