import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "soft"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          // base
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
          "transition-all duration-fast select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-40",
          "active:scale-[0.97]",
          // variants
          {
            default:
              "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md",
            destructive:
              "bg-destructive text-white shadow-sm hover:bg-red-600 hover:shadow-md",
            outline:
              "border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text)] shadow-xs hover:bg-[var(--surface-2)] hover:border-[var(--accent)]",
            ghost:
              "text-[var(--text)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]",
            link:
              "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto",
            soft:
              "bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]",
          }[variant],
          // sizes
          {
            default: "h-9 px-4 py-2",
            sm: "h-8 px-3 text-xs rounded-md",
            lg: "h-10 px-6 text-base rounded-xl",
            icon: "h-9 w-9",
            "icon-sm": "h-7 w-7 rounded-md",
          }[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
