import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import type { CreateAccountInput, UpdateAccountInput } from '../validators/account'
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
  const body = c.get('validatedBody') as CreateAccountInput

  try {
    const account = await c.get('db').account.create({
      data: { ...body, userId: c.get('userId') },
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
  const body = c.get('validatedBody') as UpdateAccountInput

  const db = c.get('db')
  const existing = await db.account.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Account not found' }, 404)

  try {
    const account = await db.account.update({ where: { id }, data: body })
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
