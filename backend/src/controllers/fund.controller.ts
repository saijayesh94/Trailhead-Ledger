import type { Context } from 'hono'
import { Prisma, type PrismaClient } from '@prisma/client'
import type {
  CreateFundInput,
  UpdateFundInput,
  CreateFundDepositInput,
  UpdateFundDepositInput,
  CreateFundExpenseInput,
  UpdateFundExpenseInput,
} from '../validators/fund'
import type { Env, Variables } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

// Funds are standalone: nothing in this controller reads or writes Transactions,
// Accounts or Owners, so fund activity never affects the main ledger's balances.

const EXPENSE_INCLUDE = {
  category: { select: { id: true, name: true } },
} as const

const CLOSED_FUND = 'This fund is closed. Reopen it to add entries.'

function findFund(db: PrismaClient, userId: string, id: string | undefined) {
  return db.fund.findFirst({ where: { id, userId } })
}

function toTotals(deposited: Prisma.Decimal | null, spent: Prisma.Decimal | null) {
  const totalDeposited = deposited ?? new Prisma.Decimal(0)
  const totalSpent = spent ?? new Prisma.Decimal(0)
  return {
    totalDeposited: totalDeposited.toFixed(2),
    totalSpent: totalSpent.toFixed(2),
    remaining: totalDeposited.sub(totalSpent).toFixed(2),
  }
}

// ---------------------------------------------------------------------------
// Funds
// ---------------------------------------------------------------------------

export async function listFunds(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')

  const [funds, depositSums, expenseSums] = await Promise.all([
    db.fund.findMany({
      where: { userId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    }),
    db.fundDeposit.groupBy({ by: ['fundId'], where: { userId }, _sum: { amount: true } }),
    db.fundExpense.groupBy({ by: ['fundId'], where: { userId }, _sum: { amount: true }, _count: true }),
  ])

  const depositedByFund = new Map(depositSums.map((row) => [row.fundId, row._sum.amount]))
  const expensesByFund = new Map(expenseSums.map((row) => [row.fundId, row]))

  return c.json({
    funds: funds.map((fund) => {
      const expenses = expensesByFund.get(fund.id)
      return {
        ...fund,
        ...toTotals(depositedByFund.get(fund.id) ?? null, expenses?._sum.amount ?? null),
        expenseCount: expenses?._count ?? 0,
      }
    }),
  })
}

export async function getFund(c: AppContext) {
  const db = c.get('db')
  const userId = c.get('userId')
  const fund = await findFund(db, userId, c.req.param('id'))
  if (!fund) return c.json({ error: 'Fund not found' }, 404)

  const [deposits, expenses] = await Promise.all([
    db.fundDeposit.findMany({
      where: { fundId: fund.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    db.fundExpense.findMany({
      where: { fundId: fund.id },
      include: EXPENSE_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  const deposited = deposits.reduce((sum, d) => sum.add(d.amount), new Prisma.Decimal(0))
  const spent = expenses.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0))

  return c.json({
    fund: { ...fund, ...toTotals(deposited, spent), expenseCount: expenses.length },
    deposits,
    expenses,
  })
}

export async function createFund(c: AppContext) {
  const body = c.get('validatedBody') as CreateFundInput
  const fund = await c.get('db').fund.create({
    data: { ...body, userId: c.get('userId') },
  })
  return c.json({ fund: { ...fund, ...toTotals(null, null), expenseCount: 0 } }, 201)
}

export async function updateFund(c: AppContext) {
  const body = c.get('validatedBody') as UpdateFundInput
  const db = c.get('db')
  const existing = await findFund(db, c.get('userId'), c.req.param('id'))
  if (!existing) return c.json({ error: 'Fund not found' }, 404)

  // The create schema checks this on its own; an update may change only one
  // side, so it's checked against the stored value here.
  const startDate = body.startDate ?? existing.startDate
  const endDate = body.endDate === undefined ? existing.endDate : body.endDate
  if (endDate && endDate < startDate) {
    return c.json({ error: 'End date cannot be before start date' }, 400)
  }

  await db.fund.update({ where: { id: existing.id }, data: body })
  // Totals are unaffected by editing the fund itself, so the client keeps the
  // ones it has; re-read via GET /:id when they're needed.
  const fund = await db.fund.findUnique({ where: { id: existing.id } })
  return c.json({ fund })
}

export async function deleteFund(c: AppContext) {
  const db = c.get('db')
  const existing = await findFund(db, c.get('userId'), c.req.param('id'))
  if (!existing) return c.json({ error: 'Fund not found' }, 404)

  // Deposits and expenses go with it via ON DELETE CASCADE — one statement,
  // so there's no half-deleted state even without an interactive transaction.
  await db.fund.delete({ where: { id: existing.id } })
  return c.json({ success: true })
}

// Distinct deposit sources the user has typed before ("Dad", "My savings"…),
// used as suggestions in the deposit form.
export async function listDepositSources(c: AppContext) {
  const rows = await c.get('db').fundDeposit.findMany({
    where: { userId: c.get('userId') },
    distinct: ['source'],
    select: { source: true },
    orderBy: { source: 'asc' },
  })
  return c.json({ sources: rows.map((r) => r.source) })
}

// ---------------------------------------------------------------------------
// Deposits
// ---------------------------------------------------------------------------

export async function createFundDeposit(c: AppContext) {
  const body = c.get('validatedBody') as CreateFundDepositInput
  const db = c.get('db')
  const userId = c.get('userId')

  const fund = await findFund(db, userId, c.req.param('id'))
  if (!fund) return c.json({ error: 'Fund not found' }, 404)
  if (fund.status === 'closed') return c.json({ error: CLOSED_FUND }, 409)

  const deposit = await db.fundDeposit.create({ data: { ...body, fundId: fund.id, userId } })
  return c.json({ deposit }, 201)
}

export async function updateFundDeposit(c: AppContext) {
  const body = c.get('validatedBody') as UpdateFundDepositInput
  const db = c.get('db')
  const existing = await db.fundDeposit.findFirst({
    where: { id: c.req.param('depositId'), fundId: c.req.param('id'), userId: c.get('userId') },
  })
  if (!existing) return c.json({ error: 'Deposit not found' }, 404)

  const deposit = await db.fundDeposit.update({ where: { id: existing.id }, data: body })
  return c.json({ deposit })
}

export async function deleteFundDeposit(c: AppContext) {
  const db = c.get('db')
  const existing = await db.fundDeposit.findFirst({
    where: { id: c.req.param('depositId'), fundId: c.req.param('id'), userId: c.get('userId') },
  })
  if (!existing) return c.json({ error: 'Deposit not found' }, 404)

  await db.fundDeposit.delete({ where: { id: existing.id } })
  return c.json({ success: true })
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

async function isOwnFundCategory(db: PrismaClient, userId: string, fundCategoryId: string) {
  const category = await db.fundCategory.findFirst({ where: { id: fundCategoryId, userId } })
  return category !== null
}

export async function createFundExpense(c: AppContext) {
  const body = c.get('validatedBody') as CreateFundExpenseInput
  const db = c.get('db')
  const userId = c.get('userId')

  const fund = await findFund(db, userId, c.req.param('id'))
  if (!fund) return c.json({ error: 'Fund not found' }, 404)
  if (fund.status === 'closed') return c.json({ error: CLOSED_FUND }, 409)
  if (!(await isOwnFundCategory(db, userId, body.fundCategoryId))) {
    return c.json({ error: 'Invalid fund category' }, 400)
  }

  // A write combined with a relational `include` is wrapped in an
  // interactive transaction by Prisma, which the HTTP db adapter can't do —
  // so the create and the enriched read are done as two separate calls.
  const created = await db.fundExpense.create({ data: { ...body, fundId: fund.id, userId } })
  const expense = await db.fundExpense.findUnique({ where: { id: created.id }, include: EXPENSE_INCLUDE })
  return c.json({ expense }, 201)
}

export async function updateFundExpense(c: AppContext) {
  const body = c.get('validatedBody') as UpdateFundExpenseInput
  const db = c.get('db')
  const userId = c.get('userId')

  const existing = await db.fundExpense.findFirst({
    where: { id: c.req.param('expenseId'), fundId: c.req.param('id'), userId },
  })
  if (!existing) return c.json({ error: 'Expense not found' }, 404)
  if (body.fundCategoryId && !(await isOwnFundCategory(db, userId, body.fundCategoryId))) {
    return c.json({ error: 'Invalid fund category' }, 400)
  }

  await db.fundExpense.update({ where: { id: existing.id }, data: body })
  const expense = await db.fundExpense.findUnique({ where: { id: existing.id }, include: EXPENSE_INCLUDE })
  return c.json({ expense })
}

export async function deleteFundExpense(c: AppContext) {
  const db = c.get('db')
  const existing = await db.fundExpense.findFirst({
    where: { id: c.req.param('expenseId'), fundId: c.req.param('id'), userId: c.get('userId') },
  })
  if (!existing) return c.json({ error: 'Expense not found' }, 404)

  await db.fundExpense.delete({ where: { id: existing.id } })
  return c.json({ success: true })
}
