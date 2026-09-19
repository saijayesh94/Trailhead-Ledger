import { Hono } from 'hono'
import type { Env } from '../types'

const owners = new Hono<{ Bindings: Env }>()

// TODO: implement owners routes

export default owners
