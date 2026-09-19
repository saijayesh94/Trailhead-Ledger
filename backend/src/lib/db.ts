import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Cloudflare Workers forbids reusing I/O objects (sockets, promises) created
// during one request's execution context from a later request's context, so
// a module-level cached PrismaClient/Pool causes later requests to hang.
// A fresh client is created per request instead.
export function getDB(databaseUrl: string): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}
