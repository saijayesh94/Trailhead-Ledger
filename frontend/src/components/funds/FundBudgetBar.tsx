import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

interface FundBudgetBarProps {
  spent: number
  budget: number
}

export function FundBudgetBar({ spent, budget }: FundBudgetBarProps) {
  const ratio = budget > 0 ? spent / budget : 0
  const isOver = spent > budget
  const left = budget - spent

  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            isOver ? "bg-red-600" : ratio >= 0.85 ? "bg-amber-500" : "bg-green-600"
          )}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{Math.round(ratio * 100)}% of {formatCurrency(budget, "INR")}</span>
        <span className={cn(isOver && "font-medium text-red-600")}>
          {isOver ? `${formatCurrency(-left, "INR")} over budget` : `${formatCurrency(left, "INR")} left`}
        </span>
      </div>
    </div>
  )
}
