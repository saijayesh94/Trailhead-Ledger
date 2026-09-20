import type { PrismaClient } from '@prisma/client'

export type Env = {
  DATABASE_URL: string
  JWT_SECRET: string
  ENVIRONMENT: string
  FRONTEND_URL: string
}

export type Variables = {
  db: PrismaClient
  userId: string
  validatedBody: unknown
}
