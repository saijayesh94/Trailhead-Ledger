import { Hono } from 'hono'
import type { Env } from '../types'

const categories = new Hono<{ Bindings: Env }>()

// TODO: implement categories routes

export default categories
