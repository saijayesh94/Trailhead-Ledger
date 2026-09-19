import { Hono } from 'hono'
import type { Env } from '../types'

const transactions = new Hono<{ Bindings: Env }>()

// TODO: implement transactions routes

export default transactions
