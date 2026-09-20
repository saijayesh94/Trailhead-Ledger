import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { listOwners, createOwner, updateOwner, deleteOwner } from '../controllers/owner.controller'
import type { Env, Variables } from '../types'

const owners = new Hono<{ Bindings: Env; Variables: Variables }>()

owners.use('*', authMiddleware)
owners.get('/', listOwners)
owners.post('/', createOwner)
owners.patch('/:id', updateOwner)
owners.delete('/:id', deleteOwner)

export default owners
