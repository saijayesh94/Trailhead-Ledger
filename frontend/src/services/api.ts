import axios from "axios"

// Relative by default so the browser only ever talks to one origin and the
// session cookie stays first-party. In prod the Pages Function
// (functions/api/[[path]].ts) rewrites /api/* to the Worker; in dev the Vite
// proxy (vite.config.ts) does the same job. Never hardcode a backend origin
// here — service calls already include the /api/... prefix themselves.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
})

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}
