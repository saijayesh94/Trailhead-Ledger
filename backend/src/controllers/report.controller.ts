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
