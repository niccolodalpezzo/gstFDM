import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border px-3 py-2 text-sm transition-all duration-fast",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-[var(--muted-text-light)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)]",
          "hover:border-[var(--border-strong)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        style={{
          background: "var(--input-bg)",
          color: "var(--text)",
          borderColor: "var(--input-border)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
