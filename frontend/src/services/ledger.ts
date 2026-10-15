import { api } from "./api"
import type { LedgerPage } from "@/types/ledger"

export const ledgerApi = {
  async page(page: number, pageSize: number): Promise<LedgerPage> {
    const { data } = await api.get<LedgerPage>("/api/ledger", { params: { page, pageSize } })
    return data
  },
}
