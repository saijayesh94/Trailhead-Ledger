import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../controllers/auth.controller'
import { registerSchema, loginSchema } from '../validators/auth'
import type { Env, Variables } from '../types'

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()

auth.post('/register', validateInput(registerSchema), registerUser)
auth.post('/login', validateInput(loginSchema), loginUser)
auth.post('/logout', logoutUser)
auth.get('/me', authMiddleware, getCurrentUser)

export default auth
