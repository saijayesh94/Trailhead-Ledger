import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifyJWT } from '../lib/jwt'
import { SESSION_COOKIE } from '../lib/cookies'
import type { Env, Variables } from '../types'

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return c.json({ error: 'Unauthorized' }, 401)

    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    if (!payload || typeof payload.userId !== 'string') return c.json({ error: 'Unauthorized' }, 401)

    const session = await c.get('db').session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) return c.json({ error: 'Unauthorized' }, 401)

    c.set('userId', payload.userId)
    await next()
  }
)
