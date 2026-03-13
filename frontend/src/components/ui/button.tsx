import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "default": "bg-primary text-primary-foreground hover:opacity-90",
            "destructive": "bg-destructive text-destructive-foreground hover:opacity-90",
            "outline": "border border-border bg-transparent hover:bg-muted",
            "ghost": "hover:bg-muted",
            "link": "text-primary underline-offset-4 hover:underline",
          }[variant],
          {
            "default": "h-9 px-4 py-2",
            "sm": "h-8 px-3 text-xs",
            "lg": "h-10 px-6",
            "icon": "h-9 w-9",
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
