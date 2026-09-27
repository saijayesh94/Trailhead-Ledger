import { createResourceApi } from "./resource"
import type { FundCategory, FundCategoryInput, FundCategoryUpdate } from "@/types/fund"

export const fundCategoriesApi = createResourceApi<FundCategory, FundCategoryInput, FundCategoryUpdate>(
  "/api/fund-categories",
  "fundCategories"
)
