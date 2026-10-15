import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { listLedger } from '../controllers/ledger.controller'
import type { Env, Variables } from '../types'

const ledger = new Hono<{ Bindings: Env; Variables: Variables }>()

ledger.get('/', authMiddleware, listLedger)

export default ledger
