import type { Context } from 'hono'
import type { CreateTransferInput } from '../validators/transfer'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

const TRANSFER_INCLUDE = {
  fromAccount: { select: { id: true, name: true, currency: true } },
  toAccount: { select: { id: true, name: true, currency: true } },
  owner: { select: { id: true, name: true, color: true } },
} as const

export async function listTransfers(c: AppContext) {
  const transfers = await c.get('db').transfer.findMany({
    where: { userId: c.get('userId') },
    include: TRANSFER_INCLUDE,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  return c.json({ transfers })
}

export async function createTransfer(c: AppContext) {
  const body = c.get('validatedBody') as CreateTransferInput
  const db = c.get('db')
  const userId = c.get('userId')

  const [fromAccount, toAccount, owner] = await Promise.all([
    db.account.findFirst({ where: { id: body.fromAccountId, userId } }),
    db.account.findFirst({ where: { id: body.toAccountId, userId } }),
    db.owner.findFirst({ where: { id: body.ownerId, userId } }),
  ])
  if (!fromAccount) return c.json({ error: 'Invalid source account' }, 400)
  if (!toAccount) return c.json({ error: 'Invalid destination account' }, 400)
  if (!owner) return c.json({ error: 'Invalid owner' }, 400)

  // A write combined with a relational `include` is wrapped in an
  // interactive transaction by Prisma, which the HTTP db adapter can't do —
  // so the create and the enriched read are done as two separate calls.
  const created = await db.transfer.create({ data: { ...body, userId } })
  const transfer = await db.transfer.findUnique({
    where: { id: created.id },
    include: TRANSFER_INCLUDE,
  })
  return c.json({ transfer }, 201)
}
