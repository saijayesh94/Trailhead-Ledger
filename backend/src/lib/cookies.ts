import type { Context } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from '../types'

export const SESSION_COOKIE = 'trailhead_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setSessionCookie(c: Context<any>, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: (c.env as Env).ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clearSessionCookie(c: Context<any>) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
