import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import { listOwners, createOwner, updateOwner, deleteOwner } from '../controllers/owner.controller'
import { createOwnerSchema, updateOwnerSchema } from '../validators/owner'
import type { Env, Variables } from '../types'

const owners = new Hono<{ Bindings: Env; Variables: Variables }>()

owners.get('/', authMiddleware, listOwners)
owners.post('/', validateInput(createOwnerSchema), authMiddleware, createOwner)
owners.patch('/:id', validateInput(updateOwnerSchema), authMiddleware, updateOwner)
owners.delete('/:id', authMiddleware, deleteOwner)

export default owners
