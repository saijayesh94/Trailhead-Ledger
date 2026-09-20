import type { Context } from 'hono'
import { Prisma } from '@prisma/client'
import { computeAccountBalances, computeOwnerBalances } from '../lib/balance'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfNextMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

export async function getDashboard(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')

  const from = startOfMonth()
  const to = startOfNextMonth()

  const [accounts, owners, accountBalances, ownerBalances, monthIncome, monthExpense, categorySpend, categories] =
    await Promise.all([
      db.account.findMany({ where: { userId, isActive: true } }),
      db.owner.findMany({ where: { userId, isActive: true } }),
      computeAccountBalances(db, userId),
      computeOwnerBalances(db, userId),
      db.transaction.aggregate({
        where: { userId, type: { in: ['income', 'received'] }, date: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      db.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'expense', date: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      db.category.findMany({ where: { userId } }),
    ])

  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]))
  const primaryCurrency = accounts[0]?.currency ?? 'INR'

  const totalBalance = accounts.reduce(
    (sum, a) => sum.add(accountBalances.get(a.id) ?? new Prisma.Decimal(0)),
    new Prisma.Decimal(0)
  )

  const income = monthIncome._sum.amount ?? new Prisma.Decimal(0)
  const expenses = monthExpense._sum.amount ?? new Prisma.Decimal(0)

  return c.json({
    currency: primaryCurrency,
    totalBalance: totalBalance.toFixed(2),
    owners: owners.map((o) => ({
      id: o.id,
      name: o.name,
      color: o.color,
      balance: (ownerBalances.get(o.id) ?? new Prisma.Decimal(0)).toFixed(2),
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      balance: (accountBalances.get(a.id) ?? new Prisma.Decimal(0)).toFixed(2),
    })),
    thisMonth: {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      net: income.sub(expenses).toFixed(2),
    },
    spendingByCategory: categorySpend
      .map((row) => ({
        categoryId: row.categoryId,
        name: categoryNameById.get(row.categoryId) ?? 'Unknown',
        amount: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
  })
}
