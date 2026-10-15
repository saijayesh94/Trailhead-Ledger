import { useCallback, useEffect, useRef, useState } from "react"
import { ledgerApi } from "@/services/ledger"
import { getErrorMessage } from "@/services/api"
import type { LedgerEntry } from "@/types/ledger"

// After an add/edit/delete the cached pages are re-fetched once things go
// quiet, so a burst of quick adds costs one refresh instead of one per add.
const REFRESH_DELAY_MS = 800

interface CachedPage {
  // Generation the page was fetched in; older than `wantedGen` means stale
  gen: number
  entries: LedgerEntry[]
}

function entryKey(entry: LedgerEntry) {
  return `${entry.kind}-${entry.data.id}`
}

// Pages through the combined transactions + transfers list, keeping the page
// after the current one loaded so moving forward is instant: pages 1–2 load
// first, and on page N the hook fetches N+1.
export function useLedgerPages(pageSize: number) {
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState<Record<number, CachedPage>>({})
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Bumped on every local change so responses already in flight (which may
  // predate that change) are dropped instead of overwriting it.
  const genRef = useRef(0)
  // Pages fetched before this generation get re-fetched when next needed.
  const [wantedGen, setWantedGen] = useState(0)
  const inFlight = useRef(new Set<string>())
  const refreshTimer = useRef<number | undefined>(undefined)

  const pageCount = total === null ? 1 : Math.max(1, Math.ceil(total / pageSize))
  // Deletes can shrink the list out from under the current page
  const currentPage = Math.min(page, pageCount)

  const loadPage = useCallback(
    (p: number) => {
      const gen = genRef.current
      const key = `${gen}:${p}`
      if (inFlight.current.has(key)) return
      inFlight.current.add(key)
      ledgerApi
        .page(p, pageSize)
        .then((res) => {
          if (gen !== genRef.current) return
          setPages((prev) => ({ ...prev, [p]: { gen, entries: res.entries } }))
          setTotal(res.total)
          setError(null)
        })
        .catch((err) => {
          if (gen === genRef.current) setError(getErrorMessage(err, "Could not load transactions"))
        })
        .finally(() => inFlight.current.delete(key))
    },
    [pageSize]
  )

  useEffect(() => {
    for (const p of [currentPage, currentPage + 1]) {
      if (total !== null && p > pageCount) continue
      const cached = pages[p]
      if (!cached || cached.gen < wantedGen) loadPage(p)
    }
  }, [currentPage, pageCount, total, pages, wantedGen, loadPage])

  useEffect(() => () => window.clearTimeout(refreshTimer.current), [])

  function invalidate() {
    genRef.current += 1
    window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => setWantedGen(genRef.current), REFRESH_DELAY_MS)
  }

  function mapPages(fn: (entries: LedgerEntry[], p: number) => LedgerEntry[]) {
    setPages((prev) => {
      const next: Record<number, CachedPage> = {}
      for (const [p, cached] of Object.entries(prev)) {
        next[Number(p)] = { ...cached, entries: fn(cached.entries, Number(p)) }
      }
      return next
    })
  }

  // Shows a newly saved entry right away when it falls on page 1 (the usual
  // case: it's dated today); the follow-up refresh places it exactly.
  function insertEntry(entry: LedgerEntry) {
    mapPages((entries, p) => {
      if (p !== 1) return entries
      const index = entries.findIndex((e) => e.data.date <= entry.data.date)
      if (index === -1) return entries.length < pageSize ? [...entries, entry] : entries
      return [...entries.slice(0, index), entry, ...entries.slice(index)]
    })
    setTotal((t) => (t === null ? t : t + 1))
    invalidate()
  }

  function replaceEntry(entry: LedgerEntry) {
    const key = entryKey(entry)
    mapPages((entries) => entries.map((e) => (entryKey(e) === key ? entry : e)))
    invalidate()
  }

  function removeEntry(entry: LedgerEntry) {
    const key = entryKey(entry)
    mapPages((entries) => entries.filter((e) => entryKey(e) !== key))
    setTotal((t) => (t === null ? t : Math.max(0, t - 1)))
    invalidate()
  }

  return {
    page: currentPage,
    pageCount,
    setPage,
    // null while the current page has never been loaded
    entries: pages[currentPage]?.entries ?? null,
    total,
    error,
    insertEntry,
    replaceEntry,
    removeEntry,
  }
}
