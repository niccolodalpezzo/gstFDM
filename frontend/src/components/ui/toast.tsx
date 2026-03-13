import * as React from "react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  message: string
  type?: "success" | "error" | "info"
}

interface ToastContextType {
  toasts: Toast[]
  toast: (message: string, type?: Toast["type"]) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
              "animate-in slide-in-from-right-5",
              t.type === "error" && "border-red-500/30 bg-red-500/10 text-red-600",
              t.type === "success" && "border-green-500/30 text-green-700 dark:text-green-400",
              t.type === "info" && "border-blue-500/30 text-blue-700 dark:text-blue-400",
            )}
            style={
              t.type === "success"
                ? { background: "var(--card-bg)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }
                : { background: "var(--card-bg)" }
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx.toast
}
