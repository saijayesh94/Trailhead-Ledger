import { api } from "./api"

export function createResourceApi<T, TInput, TUpdate = Partial<TInput>>(
  basePath: string,
  listKey: string
) {
  return {
    async list(): Promise<T[]> {
      const { data } = await api.get<Record<string, T[]>>(basePath)
      return data[listKey]
    },
    async create(input: TInput): Promise<T> {
      const { data } = await api.post<Record<string, T>>(basePath, input)
      return Object.values(data)[0] as T
    },
    async update(id: string, input: TUpdate): Promise<T> {
      const { data } = await api.patch<Record<string, T>>(`${basePath}/${id}`, input)
      return Object.values(data)[0] as T
    },
    async remove(id: string): Promise<void> {
      await api.delete(`${basePath}/${id}`)
    },
  }
}
