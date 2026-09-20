import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import { createAccountSchema, updateAccountSchema } from '../validators/account'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export async function listAccounts(c: AppContext) {
  const accounts = await c.get('db').account.findMany({
    where: { userId: c.get('userId') },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return c.json({ accounts })
}

export async function createAccount(c: AppContext) {
  const body = await c.req.json().catch(() => null)
  const parsed = createAccountSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  try {
    const account = await c.get('db').account.create({
      data: { ...parsed.data, userId: c.get('userId') },
    })
    return c.json({ account }, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'An account with this name already exists' }, 409)
    }
    throw err
  }
}

export async function updateAccount(c: AppContext) {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const parsed = updateAccountSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  const db = c.get('db')
  const existing = await db.account.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Account not found' }, 404)

  try {
    const account = await db.account.update({ where: { id }, data: parsed.data })
    return c.json({ account })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'An account with this name already exists' }, 409)
    }
    throw err
  }
}

export async function deleteAccount(c: AppContext) {
  const id = c.req.param('id')
  const db = c.get('db')
  const existing = await db.account.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Account not found' }, 404)

  try {
    await db.account.delete({ where: { id } })
    return c.json({ success: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
      return c.json({ error: 'This account is used by existing transactions or transfers. Deactivate it instead of deleting.' }, 409)
    }
    throw err
  }
}
