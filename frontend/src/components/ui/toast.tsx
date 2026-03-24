import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

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

const TOAST_STYLES = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "var(--success)",
    bg: "var(--success-bg)",
    border: "color-mix(in srgb, var(--success) 25%, transparent)",
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    color: "var(--error)",
    bg: "var(--error-bg)",
    border: "color-mix(in srgb, var(--error) 25%, transparent)",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: "var(--info)",
    bg: "var(--info-bg)",
    border: "color-mix(in srgb, var(--info) 25%, transparent)",
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const style = TOAST_STYLES[t.type ?? "info"]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm min-w-[240px] max-w-[360px]"
                style={{
                  background: style.bg,
                  borderColor: style.border,
                  color: style.color,
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <span className="shrink-0">{style.icon}</span>
                <span className="flex-1 font-medium">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx.toast
}
