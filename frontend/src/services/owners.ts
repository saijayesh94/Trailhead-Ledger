import { createResourceApi } from "./resource"
import type { Owner, OwnerInput, OwnerUpdate } from "@/types/owner"

export const ownersApi = createResourceApi<Owner, OwnerInput, OwnerUpdate>("/api/owners", "owners")
