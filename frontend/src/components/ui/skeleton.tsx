import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "block" | "circle" | "badge"
}

export function Skeleton({ className, variant = "block", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton",
        {
          text:   "h-4 rounded",
          block:  "rounded-xl",
          circle: "rounded-full",
          badge:  "h-5 w-16 rounded-full",
        }[variant],
        className
      )}
      {...props}
    />
  )
}

/** Pre-built skeleton for a KPI stat card */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-3"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-3 w-24" />
        <Skeleton variant="circle" className="h-7 w-7" />
      </div>
      <Skeleton variant="text" className="h-7 w-20 mt-1" />
      <Skeleton variant="text" className="h-3 w-32" />
    </div>
  )
}

/** Pre-built skeleton for a data table row */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
      {[...Array(cols)].map((_, i) => (
        <Skeleton key={i} variant="text" className={cn("flex-1", i === 0 && "max-w-[160px]")} />
      ))}
    </div>
  )
}
