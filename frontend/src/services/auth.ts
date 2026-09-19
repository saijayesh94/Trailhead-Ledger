import { api } from "./api"
import type { LoginInput, RegisterInput, User } from "@/types/auth"

export async function registerUser(input: RegisterInput): Promise<User> {
  const { data } = await api.post<{ user: User }>("/api/auth/register", input)
  return data.user
}

export async function loginUser(input: LoginInput): Promise<User> {
  const { data } = await api.post<{ user: User }>("/api/auth/login", input)
  return data.user
}

export async function logoutUser(): Promise<void> {
  await api.post("/api/auth/logout")
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ user: User }>("/api/auth/me")
    return data.user
  } catch {
    return null
  }
}
