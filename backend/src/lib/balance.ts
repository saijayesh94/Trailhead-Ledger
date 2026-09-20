import { Prisma, type PrismaClient } from '@prisma/client'

function accumulator() {
  const balances = new Map<string, Prisma.Decimal>()
  return {
    add(key: string, amount: Prisma.Decimal | null) {
      if (!amount) return
      balances.set(key, (balances.get(key) ?? new Prisma.Decimal(0)).add(amount))
    },
    subtract(key: string, amount: Prisma.Decimal | null) {
      if (!amount) return
      balances.set(key, (balances.get(key) ?? new Prisma.Decimal(0)).sub(amount))
    },
    balances,
  }
}

// Balance = income/received in - expenses out, adjusted for transfers between
// accounts. There's no stored "opening balance" — per the app's design, money
// only ever enters an account via a Transaction, so the running total from
// the full history is the balance (see spec section 7).
export async function computeAccountBalances(
  db: PrismaClient,
  userId: string
): Promise<Map<string, Prisma.Decimal>> {
  const [inflows, outflows, transfersIn, transfersOut] = await Promise.all([
    db.transaction.groupBy({
      by: ['accountId'],
      where: { userId, type: { in: ['income', 'received'] } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ['accountId'],
      where: { userId, type: 'expense' },
      _sum: { amount: true },
    }),
    db.transfer.groupBy({
      by: ['toAccountId'],
      where: { userId },
      _sum: { amount: true },
    }),
    db.transfer.groupBy({
      by: ['fromAccountId'],
      where: { userId },
      _sum: { amount: true },
    }),
  ])

  const { add, subtract, balances } = accumulator()
  for (const row of inflows) add(row.accountId, row._sum.amount)
  for (const row of outflows) subtract(row.accountId, row._sum.amount)
  for (const row of transfersIn) add(row.toAccountId, row._sum.amount)
  for (const row of transfersOut) subtract(row.fromAccountId, row._sum.amount)

  return balances
}

// Owner balance = income/received in - expenses out, grouped by owner.
// Transfers are deliberately excluded: a Transfer carries a single ownerId
// for both legs (see spec section 6 — "the owner remains unchanged"), so a
// transfer's in/out amounts always cancel out for that owner and never
// change how much money they have overall, only which account it sits in.
export async function computeOwnerBalances(db: PrismaClient, userId: string): Promise<Map<string, Prisma.Decimal>> {
  const [inflows, outflows] = await Promise.all([
    db.transaction.groupBy({
      by: ['ownerId'],
      where: { userId, type: { in: ['income', 'received'] } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ['ownerId'],
      where: { userId, type: 'expense' },
      _sum: { amount: true },
    }),
  ])

  const { add, subtract, balances } = accumulator()
  for (const row of inflows) add(row.ownerId, row._sum.amount)
  for (const row of outflows) subtract(row.ownerId, row._sum.amount)

  return balances
}
