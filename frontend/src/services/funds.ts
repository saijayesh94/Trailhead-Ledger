import { api } from "./api"
import type {
  Fund,
  FundDetail,
  FundInput,
  FundRecord,
  FundUpdate,
  FundDeposit,
  FundDepositInput,
  FundExpense,
  FundExpenseInput,
} from "@/types/fund"

export const fundsApi = {
  async list(): Promise<Fund[]> {
    const { data } = await api.get<{ funds: Fund[] }>("/api/funds")
    return data.funds
  },
  async get(id: string): Promise<FundDetail> {
    const { data } = await api.get<FundDetail>(`/api/funds/${id}`)
    return data
  },
  async create(input: FundInput): Promise<Fund> {
    const { data } = await api.post<{ fund: Fund }>("/api/funds", input)
    return data.fund
  },
  // Returns the stored fund without totals — editing a fund never changes them
  async update(id: string, input: FundUpdate): Promise<FundRecord> {
    const { data } = await api.patch<{ fund: FundRecord }>(`/api/funds/${id}`, input)
    return data.fund
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/funds/${id}`)
  },
  async depositSources(): Promise<string[]> {
    const { data } = await api.get<{ sources: string[] }>("/api/funds/deposit-sources")
    return data.sources
  },

  async createDeposit(fundId: string, input: FundDepositInput): Promise<FundDeposit> {
    const { data } = await api.post<{ deposit: FundDeposit }>(`/api/funds/${fundId}/deposits`, input)
    return data.deposit
  },
  async updateDeposit(fundId: string, id: string, input: Partial<FundDepositInput>): Promise<FundDeposit> {
    const { data } = await api.patch<{ deposit: FundDeposit }>(`/api/funds/${fundId}/deposits/${id}`, input)
    return data.deposit
  },
  async removeDeposit(fundId: string, id: string): Promise<void> {
    await api.delete(`/api/funds/${fundId}/deposits/${id}`)
  },

  async createExpense(fundId: string, input: FundExpenseInput): Promise<FundExpense> {
    const { data } = await api.post<{ expense: FundExpense }>(`/api/funds/${fundId}/expenses`, input)
    return data.expense
  },
  async updateExpense(fundId: string, id: string, input: Partial<FundExpenseInput>): Promise<FundExpense> {
    const { data } = await api.patch<{ expense: FundExpense }>(`/api/funds/${fundId}/expenses/${id}`, input)
    return data.expense
  },
  async removeExpense(fundId: string, id: string): Promise<void> {
    await api.delete(`/api/funds/${fundId}/expenses/${id}`)
  },
}
