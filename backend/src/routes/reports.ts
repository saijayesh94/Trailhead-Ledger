import { Hono } from 'hono'
import type { Env } from '../types'

const reports = new Hono<{ Bindings: Env }>()

// TODO: implement reports routes

export default reports
