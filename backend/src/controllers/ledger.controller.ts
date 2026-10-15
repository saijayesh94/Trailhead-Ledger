import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { TRANSACTION_INCLUDE } from './transaction.controller'
import { TRANSFER_INCLUDE } from './transfer.controller'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function toPositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

// One page of the transactions page's combined list: transactions and transfers
// interleaved by date, newest first. The two tables are paged together in SQL
// so the order is correct across page boundaries, then the page's rows are
// enriched with their relations by id.
export async function listLedger(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')
  const page = toPositiveInt(c.req.query('page'), 1)
  const pageSize = Math.min(toPositiveInt(c.req.query('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
  const offset = (page - 1) * pageSize

  const [rows, transactionCount, transferCount] = await Promise.all([
    db.$queryRaw<{ kind: 'transaction' | 'transfer'; id: string }[]>`
      SELECT kind, id FROM (
        SELECT 'transaction' AS kind, id, date, "createdAt" FROM "Transaction" WHERE "userId" = ${userId}
        UNION ALL
        SELECT 'transfer' AS kind, id, date, "createdAt" FROM "Transfer" WHERE "userId" = ${userId}
      ) AS ledger
      ORDER BY date DESC, "createdAt" DESC, id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    db.transaction.count({ where: { userId } }),
    db.transfer.count({ where: { userId } }),
  ])

  const idsOf = (kind: 'transaction' | 'transfer') => rows.filter((r) => r.kind === kind).map((r) => r.id)
  const [transactions, transfers] = await Promise.all([
    db.transaction.findMany({ where: { id: { in: idsOf('transaction') }, userId }, include: TRANSACTION_INCLUDE }),
    db.transfer.findMany({ where: { id: { in: idsOf('transfer') }, userId }, include: TRANSFER_INCLUDE }),
  ])
  const transactionById = new Map(transactions.map((t) => [t.id, t]))
  const transferById = new Map(transfers.map((t) => [t.id, t]))

  const entries = rows
    .map((row) => ({
      kind: row.kind,
      data: row.kind === 'transaction' ? transactionById.get(row.id) : transferById.get(row.id),
    }))
    // A row deleted between the two queries has nothing to show
    .filter((entry) => entry.data)

  return c.json({ entries, total: transactionCount + transferCount, page, pageSize })
}
