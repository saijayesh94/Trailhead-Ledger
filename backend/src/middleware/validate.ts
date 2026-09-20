import { createMiddleware } from 'hono/factory'
import type { ZodSchema } from 'zod'
import type { Env, Variables } from '../types'

// Parses and validates the JSON body against the given schema before the
// request reaches the controller. A bad payload gets rejected here — the
// controller only ever sees data that already passed validation.
export function validateInput<T>(schema: ZodSchema<T>) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const body = await c.req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
    }
    c.set('validatedBody', parsed.data)
    await next()
  })
}
