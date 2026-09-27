import type { Context } from 'hono'
import type { CreateOwnerInput, UpdateOwnerInput } from '../validators/owner'
import type { Env, Variables } from '../types'
import { isUniqueViolation, isForeignKeyViolation } from '../lib/prismaErrors'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export async function listOwners(c: AppContext) {
  const owners = await c.get('db').owner.findMany({
    where: { userId: c.get('userId') },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return c.json({ owners })
}

export async function createOwner(c: AppContext) {
  const body = c.get('validatedBody') as CreateOwnerInput

  try {
    const owner = await c.get('db').owner.create({
      data: { ...body, userId: c.get('userId') },
    })
    return c.json({ owner }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: 'An owner with this name already exists' }, 409)
    }
    throw err
  }
}

export async function updateOwner(c: AppContext) {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateOwnerInput

  const db = c.get('db')
  const existing = await db.owner.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Owner not found' }, 404)

  try {
    const owner = await db.owner.update({ where: { id }, data: body })
    return c.json({ owner })
  } catch (err) {
    if (isUniqueViolation(err)) {
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
    if (isForeignKeyViolation(err)) {
      return c.json({ error: 'This owner is used by existing transactions. Deactivate it instead of deleting.' }, 409)
    }
    throw err
  }
}
