import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import { computeTotalBalanceAsOf } from '../lib/reports'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export async function getStatement(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')
  const { from, to, ownerId } = c.req.query()

  if (!from || !to) {
    return c.json({ error: 'from and to are required (YYYY-MM-DD)' }, 400)
  }

  const periodStart = new Date(from)
  // `to` is inclusive of the whole day, so the exclusive upper bound is the day after it
  const periodEnd = new Date(to)
  periodEnd.setDate(periodEnd.getDate() + 1)

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return c.json({ error: 'from and to must be valid dates (YYYY-MM-DD)' }, 400)
  }

  const [openingBalance, categoryTotals, categories] = await Promise.all([
    computeTotalBalanceAsOf(db, userId, periodStart, ownerId || undefined),
    db.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, ownerId: ownerId || undefined, date: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    db.category.findMany({ where: { userId } }),
  ])

  const categoryById = new Map(categories.map((cat) => [cat.id, cat]))

  let totalIncome = new Prisma.Decimal(0)
  let totalExpenses = new Prisma.Decimal(0)

  const lines = categoryTotals
    .map((row) => {
      const category = categoryById.get(row.categoryId)
      const amount = row._sum.amount ?? new Prisma.Decimal(0)
      const isExpense = category?.type === 'expense'
      if (isExpense) totalExpenses = totalExpenses.add(amount)
      else totalIncome = totalIncome.add(amount)
      return {
        categoryId: row.categoryId,
        name: category?.name ?? 'Unknown',
        type: category?.type ?? 'expense',
        amount: (isExpense ? amount.neg() : amount).toFixed(2),
      }
    })
    .sort((a, b) => Number(b.amount) - Number(a.amount))

  const net = totalIncome.sub(totalExpenses)
  const closingBalance = openingBalance.add(net)

  return c.json({
    from,
    to,
    openingBalance: openingBalance.toFixed(2),
    closingBalance: closingBalance.toFixed(2),
    totalIncome: totalIncome.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    net: net.toFixed(2),
    lines,
  })
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export async function exportLedger(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')
  const { from, to } = c.req.query()

  const dateFilter =
    from || to
      ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
      : {}

  const [transactions, transfers] = await Promise.all([
    db.transaction.findMany({
      where: { userId, ...dateFilter },
      include: {
        account: { select: { name: true } },
        owner: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    db.transfer.findMany({
      where: { userId, ...dateFilter },
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  interface Row {
    date: Date
    kind: string
    account: string
    toAccount: string
    owner: string
    category: string
    type: string
    description: string
    amount: string
  }

  const rows: Row[] = [
    ...transactions.map((t) => ({
      date: t.date,
      kind: 'Transaction',
      account: t.account.name,
      toAccount: '',
      owner: t.owner.name,
      category: t.category.name,
      type: t.type,
      description: t.description ?? '',
      amount: t.amount.toFixed(2),
    })),
    ...transfers.map((t) => ({
      date: t.date,
      kind: 'Transfer',
      account: t.fromAccount.name,
      toAccount: t.toAccount.name,
      owner: t.owner.name,
      category: '',
      type: '',
      description: t.description ?? '',
      amount: t.amount.toFixed(2),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  const header = ['Date', 'Kind', 'Account', 'To Account', 'Owner', 'Category', 'Type', 'Description', 'Amount']
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.date.toISOString().slice(0, 10),
        row.kind,
        row.account,
        row.toAccount,
        row.owner,
        row.category,
        row.type,
        row.description,
        row.amount,
      ]
        .map((v) => csvEscape(String(v)))
        .join(',')
    )
  }

  const csv = lines.join('\n')
  const filename = `trailhead-export-${new Date().toISOString().slice(0, 10)}.csv`

  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="${filename}"`)
  return c.body(csv)
}
