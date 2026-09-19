import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../controllers/auth.controller'
import type { Env, Variables } from '../types'

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()

auth.post('/register', registerUser)
auth.post('/login', loginUser)
auth.post('/logout', logoutUser)
auth.get('/me', authMiddleware, getCurrentUser)

export default auth
