import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller'
import { createAccountSchema, updateAccountSchema } from '../validators/account'
import type { Env, Variables } from '../types'

const accounts = new Hono<{ Bindings: Env; Variables: Variables }>()

accounts.get('/', authMiddleware, listAccounts)
accounts.post('/', validateInput(createAccountSchema), authMiddleware, createAccount)
accounts.patch('/:id', validateInput(updateAccountSchema), authMiddleware, updateAccount)
accounts.delete('/:id', authMiddleware, deleteAccount)

export default accounts
