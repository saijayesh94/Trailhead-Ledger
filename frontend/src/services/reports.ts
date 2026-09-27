import { api } from "./api"
import type { Statement } from "@/types/report"

export async function fetchStatement(from: string, to: string, ownerId?: string): Promise<Statement> {
  const { data } = await api.get<Statement>("/api/reports/statement", {
    params: { from, to, ownerId: ownerId || undefined },
  })
  return data
}
