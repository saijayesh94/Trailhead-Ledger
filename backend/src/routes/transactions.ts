import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller'
import { createTransactionSchema, updateTransactionSchema } from '../validators/transaction'
import type { Env, Variables } from '../types'

const transactions = new Hono<{ Bindings: Env; Variables: Variables }>()

transactions.get('/', authMiddleware, listTransactions)
transactions.post('/', validateInput(createTransactionSchema), authMiddleware, createTransaction)
transactions.patch('/:id', validateInput(updateTransactionSchema), authMiddleware, updateTransaction)
transactions.delete('/:id', authMiddleware, deleteTransaction)

export default transactions
