import { createMiddleware } from 'hono/factory'
import { getDB } from '../lib/db'
import type { Env, Variables } from '../types'

export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    c.set('db', getDB(c.env.DATABASE_URL))
    await next()
  }
)
