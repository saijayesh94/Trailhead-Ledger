import { createResourceApi } from "./resource"
import type { Category, CategoryInput, CategoryUpdate } from "@/types/category"

export const categoriesApi = createResourceApi<Category, CategoryInput, CategoryUpdate>("/api/categories", "categories")
