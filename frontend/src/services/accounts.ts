import { createResourceApi } from "./resource"
import type { Account, AccountInput, AccountUpdate } from "@/types/account"

export const accountsApi = createResourceApi<Account, AccountInput, AccountUpdate>("/api/accounts", "accounts")
