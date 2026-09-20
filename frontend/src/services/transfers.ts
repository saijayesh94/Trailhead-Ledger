import { api } from "./api"
import type { Transfer, TransferInput } from "@/types/transfer"

export const transfersApi = {
  async list(): Promise<Transfer[]> {
    const { data } = await api.get<{ transfers: Transfer[] }>("/api/transfers")
    return data.transfers
  },
  async create(input: TransferInput): Promise<Transfer> {
    const { data } = await api.post<{ transfer: Transfer }>("/api/transfers", input)
    return data.transfer
  },
}
