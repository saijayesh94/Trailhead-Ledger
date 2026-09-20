import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import { createCategorySchema, updateCategorySchema } from '../validators/category'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export async function listCategories(c: AppContext) {
  const categories = await c.get('db').category.findMany({
    where: { userId: c.get('userId') },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return c.json({ categories })
}

export async function createCategory(c: AppContext) {
  const body = await c.req.json().catch(() => null)
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  try {
    const category = await c.get('db').category.create({
      data: { ...parsed.data, userId: c.get('userId') },
    })
    return c.json({ category }, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'A category with this name already exists' }, 409)
    }
    throw err
  }
}

export async function updateCategory(c: AppContext) {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  const db = c.get('db')
  const existing = await db.category.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Category not found' }, 404)

  try {
    const category = await db.category.update({ where: { id }, data: parsed.data })
    return c.json({ category })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'A category with this name already exists' }, 409)
    }
    throw err
  }
}

export async function deleteCategory(c: AppContext) {
  const id = c.req.param('id')
  const db = c.get('db')
  const existing = await db.category.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Category not found' }, 404)

  try {
    await db.category.delete({ where: { id } })
    return c.json({ success: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
      return c.json({ error: 'This category is used by existing transactions. Deactivate it instead of deleting.' }, 409)
    }
    throw err
  }
}
