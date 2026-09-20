import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDashboard } from '../controllers/dashboard.controller'
import type { Env, Variables } from '../types'

const dashboard = new Hono<{ Bindings: Env; Variables: Variables }>()

dashboard.get('/', authMiddleware, getDashboard)

export default dashboard
