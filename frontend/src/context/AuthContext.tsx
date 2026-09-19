import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "@/services/auth"
import type { LoginInput, RegisterInput, User } from "@/types/auth"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const loggedInUser = await loginUser(input)
    setUser(loggedInUser)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const newUser = await registerUser(input)
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
