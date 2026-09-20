import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import { listTransfers, createTransfer } from '../controllers/transfer.controller'
import { createTransferSchema } from '../validators/transfer'
import type { Env, Variables } from '../types'

const transfers = new Hono<{ Bindings: Env; Variables: Variables }>()

transfers.get('/', authMiddleware, listTransfers)
transfers.post('/', validateInput(createTransferSchema), authMiddleware, createTransfer)

export default transfers
