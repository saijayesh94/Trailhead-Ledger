import { api } from "./api"
import type { Dashboard } from "@/types/dashboard"

export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>("/api/dashboard")
  return data
}
