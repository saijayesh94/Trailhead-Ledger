import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller'
import type { Env, Variables } from '../types'

const categories = new Hono<{ Bindings: Env; Variables: Variables }>()

categories.use('*', authMiddleware)
categories.get('/', listCategories)
categories.post('/', createCategory)
categories.patch('/:id', updateCategory)
categories.delete('/:id', deleteCategory)

export default categories
