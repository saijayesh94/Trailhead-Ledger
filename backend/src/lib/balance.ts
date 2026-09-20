import { Prisma, type PrismaClient } from '@prisma/client'

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

  const balances = new Map<string, Prisma.Decimal>()
  const add = (accountId: string, amount: Prisma.Decimal | null) => {
    if (!amount) return
    balances.set(accountId, (balances.get(accountId) ?? new Prisma.Decimal(0)).add(amount))
  }
  const subtract = (accountId: string, amount: Prisma.Decimal | null) => {
    if (!amount) return
    balances.set(accountId, (balances.get(accountId) ?? new Prisma.Decimal(0)).sub(amount))
  }

  for (const row of inflows) add(row.accountId, row._sum.amount)
  for (const row of outflows) subtract(row.accountId, row._sum.amount)
  for (const row of transfersIn) add(row.toAccountId, row._sum.amount)
  for (const row of transfersOut) subtract(row.fromAccountId, row._sum.amount)

  return balances
}
