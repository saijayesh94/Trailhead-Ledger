import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import { createOwnerSchema, updateOwnerSchema } from '../validators/owner'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export async function listOwners(c: AppContext) {
  const owners = await c.get('db').owner.findMany({
    where: { userId: c.get('userId') },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return c.json({ owners })
}

export async function createOwner(c: AppContext) {
  const body = await c.req.json().catch(() => null)
  const parsed = createOwnerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  try {
    const owner = await c.get('db').owner.create({
      data: { ...parsed.data, userId: c.get('userId') },
    })
    return c.json({ owner }, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'An owner with this name already exists' }, 409)
    }
    throw err
  }
}

export async function updateOwner(c: AppContext) {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const parsed = updateOwnerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  const db = c.get('db')
  const existing = await db.owner.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Owner not found' }, 404)

  try {
    const owner = await db.owner.update({ where: { id }, data: parsed.data })
    return c.json({ owner })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'An owner with this name already exists' }, 409)
    }
    throw err
  }
}

export async function deleteOwner(c: AppContext) {
  const id = c.req.param('id')
  const db = c.get('db')
  const existing = await db.owner.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Owner not found' }, 404)

  try {
    await db.owner.delete({ where: { id } })
    return c.json({ success: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
      return c.json({ error: 'This owner is used by existing transactions. Deactivate it instead of deleting.' }, 409)
    }
    throw err
  }
}
