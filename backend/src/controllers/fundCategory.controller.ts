import type { Context } from 'hono'
import { DEFAULT_FUND_CATEGORIES } from '../lib/seedDefaults'
import type { CreateFundCategoryInput, UpdateFundCategoryInput } from '../validators/fund'
import type { Env, Variables } from '../types'
import { isUniqueViolation, isForeignKeyViolation } from '../lib/prismaErrors'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

const DUPLICATE_NAME = 'A fund category with this name already exists'

export async function listFundCategories(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')

  let fundCategories = await db.fundCategory.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  if (fundCategories.length === 0) {
    // One create per row, like signup's seeding: Prisma wraps createMany in a
    // transaction, which the HTTP db adapter rejects. A concurrent first load
    // may insert the same names first — those unique-constraint errors are fine.
    const results = await Promise.allSettled(
      DEFAULT_FUND_CATEGORIES.map((name) => db.fundCategory.create({ data: { name, userId, isDefault: true } }))
    )
    const unexpected = results.find((r) => r.status === 'rejected' && !isUniqueViolation(r.reason))
    if (unexpected?.status === 'rejected') throw unexpected.reason
    fundCategories = await db.fundCategory.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  }

  return c.json({ fundCategories })
}

export async function createFundCategory(c: AppContext) {
  const body = c.get('validatedBody') as CreateFundCategoryInput

  try {
    const fundCategory = await c.get('db').fundCategory.create({
      data: { ...body, userId: c.get('userId') },
    })
    return c.json({ fundCategory }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: DUPLICATE_NAME }, 409)
    }
    throw err
  }
}

export async function updateFundCategory(c: AppContext) {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateFundCategoryInput

  const db = c.get('db')
  const existing = await db.fundCategory.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Fund category not found' }, 404)

  try {
    const fundCategory = await db.fundCategory.update({ where: { id }, data: body })
    return c.json({ fundCategory })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: DUPLICATE_NAME }, 409)
    }
    throw err
  }
}

export async function deleteFundCategory(c: AppContext) {
  const id = c.req.param('id')
  const db = c.get('db')
  const existing = await db.fundCategory.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Fund category not found' }, 404)

  try {
    await db.fundCategory.delete({ where: { id } })
    return c.json({ success: true })
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return c.json({ error: 'This category is used by fund expenses. Deactivate it instead of deleting.' }, 409)
    }
    throw err
  }
}
