import { Prisma, type PrismaClient } from '@prisma/client'

// The whole-ledger balance as of a cutoff date, optionally scoped to one owner.
// Transfers are deliberately excluded — moving money between the user's own
// accounts nets to zero across the whole ledger, so only Transactions affect
// the combined total (see computeOwnerBalances in balance.ts for the same
// reasoning applied per-owner).
export async function computeTotalBalanceAsOf(
  db: PrismaClient,
  userId: string,
  beforeDate: Date,
  ownerId?: string
): Promise<Prisma.Decimal> {
  const [inflow, outflow] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, ownerId, type: { in: ['income', 'received'] }, date: { lt: beforeDate } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId, ownerId, type: 'expense', date: { lt: beforeDate } },
      _sum: { amount: true },
    }),
  ])
  const income = inflow._sum.amount ?? new Prisma.Decimal(0)
  const expense = outflow._sum.amount ?? new Prisma.Decimal(0)
  return income.sub(expense)
}
