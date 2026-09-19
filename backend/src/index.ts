import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { Env, Variables } from './types'
import { dbMiddleware } from './middleware/db'

// Routes
import authRoutes from './routes/auth'
import accountRoutes from './routes/accounts'
import ownerRoutes from './routes/owners'
import categoryRoutes from './routes/categories'
import transactionRoutes from './routes/transactions'
import transferRoutes from './routes/transfers'
import dashboardRoutes from './routes/dashboard'
import reportRoutes from './routes/reports'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Global middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('/api/*', cors({
  origin: (origin, c) => {
    if (!origin) return null
    if (origin === c.env.FRONTEND_URL || origin === 'https://trailhead.in') return origin
    // Vite/Wrangler auto-bump ports when the default one is busy, so any
    // localhost origin is trusted in non-production to avoid drift breaking CORS.
    if (c.env.ENVIRONMENT !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return origin
    return null
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))
app.use('/api/*', dbMiddleware)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'trailhead-api' }))

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/accounts', accountRoutes)
app.route('/api/owners', ownerRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/transactions', transactionRoutes)
app.route('/api/transfers', transferRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/reports', reportRoutes)

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
