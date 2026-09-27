import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getStatement } from '../controllers/report.controller'
import type { Env, Variables } from '../types'

const reports = new Hono<{ Bindings: Env; Variables: Variables }>()

reports.get('/statement', authMiddleware, getStatement)

export default reports
