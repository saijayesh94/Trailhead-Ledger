import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller'
import type { Env, Variables } from '../types'

const accounts = new Hono<{ Bindings: Env; Variables: Variables }>()

accounts.use('*', authMiddleware)
accounts.get('/', listAccounts)
accounts.post('/', createAccount)
accounts.patch('/:id', updateAccount)
accounts.delete('/:id', deleteAccount)

export default accounts
