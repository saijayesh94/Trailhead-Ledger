import * as React from "react"
import { cn } from "@/lib/utils"

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Select }
