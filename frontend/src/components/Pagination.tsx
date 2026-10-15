import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// First, last and the pages either side of the current one, with "…" for the
// gaps: 1 … 4 5 6 … 12. A gap of a single page shows that page instead.
function pageItems(current: number, count: number): (number | "gap")[] {
  const wanted = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b)
  const items: (number | "gap")[] = []
  wanted.forEach((p, i) => {
    const prev = wanted[i - 1]
    if (prev !== undefined && p - prev === 2) items.push(prev + 1)
    else if (prev !== undefined && p - prev > 2) items.push("gap")
    items.push(p)
  })
  return items
}

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1">
      <Button
        size="icon"
        variant="outline"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft />
      </Button>
      {pageItems(page, pageCount).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={item}
            size="icon"
            variant={item === page ? "default" : "outline"}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </Button>
        )
      )}
      <Button
        size="icon"
        variant="outline"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}
