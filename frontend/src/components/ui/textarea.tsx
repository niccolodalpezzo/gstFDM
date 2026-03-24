import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[104px] w-full rounded-xl border text-sm px-3 py-2.5 transition-all duration-fast",
          "placeholder:text-[var(--muted-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          background: "var(--input-bg, transparent)",
          borderColor: "var(--input-border)",
          color: "var(--text)"
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
