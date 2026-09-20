import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller'
import { createCategorySchema, updateCategorySchema } from '../validators/category'
import type { Env, Variables } from '../types'

const categories = new Hono<{ Bindings: Env; Variables: Variables }>()

categories.get('/', authMiddleware, listCategories)
categories.post('/', validateInput(createCategorySchema), authMiddleware, createCategory)
categories.patch('/:id', validateInput(updateCategorySchema), authMiddleware, updateCategory)
categories.delete('/:id', authMiddleware, deleteCategory)

export default categories
