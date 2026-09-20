import type { Context } from 'hono'
import type { PrismaClient } from '@prisma/client'
import type { CreateTransactionInput, UpdateTransactionInput } from '../validators/transaction'
import { recordTransactionEdits } from '../lib/audit'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

const TRANSACTION_INCLUDE = {
  account: { select: { id: true, name: true, currency: true } },
  owner: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, type: true } },
} as const

async function findOwnershipError(
  db: PrismaClient,
  userId: string,
  ids: { accountId: string; ownerId: string; categoryId: string }
): Promise<string | null> {
  const [account, owner, category] = await Promise.all([
    db.account.findFirst({ where: { id: ids.accountId, userId } }),
    db.owner.findFirst({ where: { id: ids.ownerId, userId } }),
    db.category.findFirst({ where: { id: ids.categoryId, userId } }),
  ])
  if (!account) return 'Invalid account'
  if (!owner) return 'Invalid owner'
  if (!category) return 'Invalid category'
  return null
}

export async function listTransactions(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')
  const { accountId, ownerId, categoryId, type, from, to } = c.req.query()

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      ...(accountId ? { accountId } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: TRANSACTION_INCLUDE,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return c.json({ transactions })
}

export async function createTransaction(c: AppContext) {
  const body = c.get('validatedBody') as CreateTransactionInput
  const db = c.get('db')
  const userId = c.get('userId')

  const error = await findOwnershipError(db, userId, body)
  if (error) return c.json({ error }, 400)

  // A write combined with a relational `include` is wrapped in an
  // interactive transaction by Prisma, which the HTTP db adapter can't do —
  // so the create and the enriched read are done as two separate calls.
  const created = await db.transaction.create({ data: { ...body, userId } })
  const transaction = await db.transaction.findUnique({
    where: { id: created.id },
    include: TRANSACTION_INCLUDE,
  })
  return c.json({ transaction }, 201)
}

export async function updateTransaction(c: AppContext) {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateTransactionInput
  const db = c.get('db')
  const userId = c.get('userId')

  const existing = await db.transaction.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Transaction not found' }, 404)

  if (body.accountId || body.ownerId || body.categoryId) {
    const error = await findOwnershipError(db, userId, {
      accountId: body.accountId ?? existing.accountId,
      ownerId: body.ownerId ?? existing.ownerId,
      categoryId: body.categoryId ?? existing.categoryId,
    })
    if (error) return c.json({ error }, 400)
  }

  await db.transaction.update({ where: { id }, data: body })
  await recordTransactionEdits(db, id!, userId, existing, body)

  const transaction = await db.transaction.findUnique({
    where: { id },
    include: TRANSACTION_INCLUDE,
  })

  return c.json({ transaction })
}

export async function deleteTransaction(c: AppContext) {
  const id = c.req.param('id')
  const db = c.get('db')
  const existing = await db.transaction.findFirst({ where: { id, userId: c.get('userId') } })
  if (!existing) return c.json({ error: 'Transaction not found' }, 404)

  await db.transaction.delete({ where: { id } })
  return c.json({ success: true })
}
