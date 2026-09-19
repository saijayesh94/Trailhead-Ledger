import { Hono } from 'hono'
import type { Env } from '../types'

const accounts = new Hono<{ Bindings: Env }>()

// TODO: implement accounts routes

export default accounts
