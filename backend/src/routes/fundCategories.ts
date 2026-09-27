import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { validateInput } from '../middleware/validate'
import {
  listFundCategories,
  createFundCategory,
  updateFundCategory,
  deleteFundCategory,
} from '../controllers/fundCategory.controller'
import { createFundCategorySchema, updateFundCategorySchema } from '../validators/fund'
import type { Env, Variables } from '../types'

const fundCategories = new Hono<{ Bindings: Env; Variables: Variables }>()

fundCategories.get('/', authMiddleware, listFundCategories)
fundCategories.post('/', validateInput(createFundCategorySchema), authMiddleware, createFundCategory)
fundCategories.patch('/:id', validateInput(updateFundCategorySchema), authMiddleware, updateFundCategory)
fundCategories.delete('/:id', authMiddleware, deleteFundCategory)

export default fundCategories
