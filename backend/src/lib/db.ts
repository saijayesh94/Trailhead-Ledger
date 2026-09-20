import { PrismaClient } from '@prisma/client'
import { PrismaNeonHTTP } from '@prisma/adapter-neon'

// Cloudflare Workers forbids reusing I/O objects (sockets, promises) created
// during one request's execution context from a later request's context, so
// a module-level cached PrismaClient/Pool causes later requests to hang (see
// git history for the WebSocket-Pool version that had this bug).
//
// The HTTP adapter is used instead of the WebSocket Pool one: it's a single
// HTTPS call per query with no connection handshake to keep alive, which is
// both correct per-request and far faster than paying a fresh TCP+TLS+WS+auth
// handshake to Neon on every request. Trade-off: it does not support
// interactive transactions (Prisma's automatic nested-write transactions or
// `$transaction(async (tx) => ...)`) — write code that avoids needing those
// (e.g. `createMany` instead of nested `create`) rather than switching adapters.
export function getDB(databaseUrl: string): PrismaClient {
  const adapter = new PrismaNeonHTTP(databaseUrl, {})
  return new PrismaClient({ adapter })
}
