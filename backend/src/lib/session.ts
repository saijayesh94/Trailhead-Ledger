import type { PrismaClient } from '@prisma/client'
import { signJWT } from './jwt'
import { SESSION_MAX_AGE_SECONDS } from './cookies'

export async function createSession(db: PrismaClient, userId: string, jwtSecret: string): Promise<string> {
  const token = await signJWT({ userId }, jwtSecret, SESSION_MAX_AGE_SECONDS)
  await db.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    },
  })
  return token
}
