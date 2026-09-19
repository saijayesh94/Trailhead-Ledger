import { Hono } from 'hono'
import type { Env } from '../types'

const transfers = new Hono<{ Bindings: Env }>()

// TODO: implement transfers routes

export default transfers
