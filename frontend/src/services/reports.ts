import { api } from "./api"
import type { Statement } from "@/types/report"

export async function fetchStatement(from: string, to: string, ownerId?: string): Promise<Statement> {
  const { data } = await api.get<Statement>("/api/reports/statement", {
    params: { from, to, ownerId: ownerId || undefined },
  })
  return data
}

export function getExportUrl(from?: string, to?: string): string {
  const base = api.defaults.baseURL ?? ""
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const query = params.toString()
  return `${base}/api/reports/export${query ? `?${query}` : ""}`
}
