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
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
          "transition-all duration-fast select-none border border-transparent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
          "disabled:pointer-events-none disabled:opacity-40",
          "active:scale-[0.97]",
          {
            default:
              "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md",
            destructive:
              "bg-[var(--error)] text-white shadow-sm hover:bg-[color-mix(in_srgb,var(--error)_84%,black)] hover:shadow-md",
            outline:
              "border-[var(--input-border)] bg-[var(--surface-2)] text-[var(--text)] shadow-xs hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)]",
            ghost:
              "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]",
            link:
              "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto",
            soft:
              "bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
          }[variant],
          {
            default: "h-10 px-4 py-2",
            sm: "h-8 px-3 text-xs rounded-lg",
            lg: "h-11 px-6 text-base rounded-2xl",
            icon: "h-10 w-10",
            "icon-sm": "h-8 w-8 rounded-lg",
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
