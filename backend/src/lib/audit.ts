import type { PrismaClient } from '@prisma/client'

const TRACKED_FIELDS = ['amount', 'type', 'description', 'date', 'accountId', 'ownerId', 'categoryId'] as const
type TrackedField = (typeof TRACKED_FIELDS)[number]

function valuesEqual(field: TrackedField, oldValue: unknown, newValue: unknown): boolean {
  if (field === 'amount') return Number(oldValue) === Number(newValue)
  if (field === 'date') return new Date(oldValue as string).getTime() === new Date(newValue as string).getTime()
  return String(oldValue ?? '') === String(newValue ?? '')
}

// Only diffs fields actually present in `after` (a partial update payload) —
// fields the caller didn't touch are left alone, not treated as "changed to undefined".
export async function recordTransactionEdits(
  db: PrismaClient,
  transactionId: string,
  userId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  const changedFields = (Object.keys(after) as TrackedField[]).filter(
    (field) => TRACKED_FIELDS.includes(field) && !valuesEqual(field, before[field], after[field])
  )

  await Promise.all(
    changedFields.map((field) =>
      db.auditLog.create({
        data: {
          transactionId,
          userId,
          field,
          oldValue: before[field] == null ? null : String(before[field]),
          newValue: after[field] == null ? null : String(after[field]),
        },
      })
    )
  )
}
