import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { Prisma } from '@prisma/client'
import type { LoginInput, RegisterInput } from '../validators/auth'
import { hashPassword, verifyPassword } from '../lib/password'
import { createSession } from '../lib/session'
import { SESSION_COOKIE, setSessionCookie, clearSessionCookie } from '../lib/cookies'
import { DEFAULT_OWNERS, DEFAULT_CATEGORIES } from '../lib/seedDefaults'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

function toPublicUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email }
}

export async function registerUser(c: AppContext) {
  const body = c.get('validatedBody') as RegisterInput
  const name = body.name.trim()
  const email = body.email.trim().toLowerCase()
  const { password } = body
  const db = c.get('db')

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409)
  }

  const passwordHash = await hashPassword(password)

  let user
  try {
    // A plain create, not a nested write or createMany — both of those get
    // wrapped in an interactive transaction by Prisma's query engine, which
    // the fast HTTP-based db adapter can't do. Individual creates can run
    // concurrently instead since each is just one INSERT statement.
    user = await db.user.create({ data: { name, email, passwordHash } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'An account with this email already exists' }, 409)
    }
    throw err
  }

  await Promise.all([
    ...DEFAULT_OWNERS.map((o) => db.owner.create({ data: { ...o, userId: user.id, isDefault: true } })),
    ...DEFAULT_CATEGORIES.map((cat) => db.category.create({ data: { ...cat, userId: user.id, isDefault: true } })),
  ])

  const token = await createSession(db, user.id, c.env.JWT_SECRET)
  setSessionCookie(c, token)

  return c.json({ user: toPublicUser(user) }, 201)
}

export async function loginUser(c: AppContext) {
  const body = c.get('validatedBody') as LoginInput
  const email = body.email.trim().toLowerCase()
  const { password } = body
  const db = c.get('db')

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const token = await createSession(db, user.id, c.env.JWT_SECRET)
  setSessionCookie(c, token)

  return c.json({ user: toPublicUser(user) })
}

export async function logoutUser(c: AppContext) {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    await c.get('db').session.deleteMany({ where: { token } })
  }
  clearSessionCookie(c)
  return c.json({ success: true })
}

export async function getCurrentUser(c: AppContext) {
  const db = c.get('db')
  const user = await db.user.findUnique({ where: { id: c.get('userId') } })
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ user: toPublicUser(user) })
}
