import { Prisma } from '@prisma/client'

// Through the Neon HTTP driver adapter, Prisma surfaces constraint failures
// with the raw Postgres SQLSTATE as `code` (e.g. 23505) rather than its own
// P-codes (P2002), so both forms are checked.

// Unique constraint — e.g. a duplicate name or email
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2002' || err.code === '23505')
}

// Row is still referenced by a foreign key — e.g. deleting a category that
// transactions use. 23503 = foreign_key_violation, 23001 = restrict_violation.
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2003', 'P2014', '23503', '23001'].includes(err.code)
  )
}
