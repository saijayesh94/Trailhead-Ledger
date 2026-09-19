import { Hono } from 'hono'
import type { Env } from '../types'

const dashboard = new Hono<{ Bindings: Env }>()

// TODO: implement dashboard routes

export default dashboard
