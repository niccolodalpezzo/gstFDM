import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        {
          default:     "bg-[var(--accent)] text-[var(--accent-foreground)]",
          secondary:   "border border-[var(--border-strong)] bg-[var(--muted-bg)] text-[var(--text-secondary)]",
          destructive: "bg-[var(--error-bg)] text-[var(--error)] border border-[color-mix(in_srgb,var(--error)_20%,transparent)]",
          outline:     "border border-[var(--border-strong)] text-[var(--text)]",
          success:     "bg-[var(--success-bg)] text-[var(--success)] border border-[color-mix(in_srgb,var(--success)_20%,transparent)]",
          warning:     "bg-[var(--warning-bg)] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_20%,transparent)]",
        }[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
