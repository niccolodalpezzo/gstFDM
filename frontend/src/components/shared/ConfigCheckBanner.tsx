import { AlertTriangle, CheckCircle2, XCircle, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useConfigCheck } from "@/hooks/useConfigCheck"

export function ConfigCheckBanner() {
  const { ready, checks, isLoading } = useConfigCheck()
  const navigate = useNavigate()

  if (isLoading || ready) return null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-200 mb-2">
            Configurazione iniziale incompleta
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Per creare preventivi e ordini, completa prima la configurazione base del sistema.
          </p>
          <ul className="space-y-1.5">
            {checks.map((check) => (
              <li key={check.key} className="flex items-center gap-2 text-sm">
                {check.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className={check.ok ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}>
                  {check.label}
                </span>
                {check.ok && check.value && (
                  <span className="text-xs text-[var(--text-tertiary)]">({check.value})</span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate("/impostazioni")}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Vai alle impostazioni
          </button>
        </div>
      </div>
    </div>
  )
}
