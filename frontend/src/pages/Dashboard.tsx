import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MarginBadge } from "@/components/shared/MarginBadge"
import { formatEur } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus, FileText } from "lucide-react"

function KpiCard({
  label,
  value,
  icon: Icon,
  positive,
}: {
  label: string
  value: number
  icon: React.ElementType
  positive?: boolean
}) {
  const color =
    positive === undefined
      ? "var(--accent)"
      : positive
      ? "var(--accent)"
      : "#ef4444"

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
            {label}
          </p>
          <Icon className="h-4 w-4 opacity-40" />
        </div>
        <p className="text-3xl font-bold" style={{ color }}>
          {formatEur(value)}
        </p>
      </CardContent>
    </Card>
  )
}

async function downloadReport(id: number, nome: string, toast: (msg: string, type?: "success" | "error" | "info") => void) {
  try {
    const blob = await api.progetti.report(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Report_${nome}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast("Report generato", "success")
  } catch {
    toast("Errore generazione report", "error")
  }
}

export default function Dashboard() {
  const toast = useToast()

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: api.dashboard.summary,
  })

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: api.dashboard.projects,
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Dashboard Generale
      </h2>

      {/* KPI */}
      {loadingSummary ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6 h-24 animate-pulse" style={{ background: "var(--muted-bg)" }} />
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <KpiCard label="Entrate (Terminati)" value={summary.entrate} icon={TrendingUp} positive={true} />
          <KpiCard label="Costi Totali" value={summary.uscite} icon={TrendingDown} positive={false} />
          <KpiCard
            label="Margine Netto"
            value={summary.margine}
            icon={Minus}
            positive={summary.margine >= 0}
          />
        </div>
      ) : null}

      {/* Project Cards */}
      <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>
        Tutti i Progetti
      </h3>

      {loadingCards ? (
        <p className="opacity-50">Caricamento...</p>
      ) : cards.length === 0 ? (
        <p className="opacity-50">Nessun progetto. Creane uno nella sezione Progetti.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ progetto: p, calcoli }) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.nome}</CardTitle>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                      {p.cliente || "–"} · {p.stato}
                    </p>
                  </div>
                  <MarginBadge perc={calcoli.margine_perc} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1 text-sm mb-3">
                  <div>
                    <p className="opacity-50 text-xs">Budget</p>
                    <p className="font-medium">{formatEur(p.budget)}</p>
                  </div>
                  <div>
                    <p className="opacity-50 text-xs">Costo Totale</p>
                    <p className="font-medium">{formatEur(calcoli.costo_totale)}</p>
                  </div>
                  <div>
                    <p className="opacity-50 text-xs">Margine</p>
                    <p className="font-medium" style={{ color: calcoli.margine_assoluto >= 0 ? "var(--accent)" : "#ef4444" }}>
                      {formatEur(calcoli.margine_assoluto)}
                    </p>
                  </div>
                  <div>
                    <p className="opacity-50 text-xs">Ore Stampa</p>
                    <p className="font-medium">{calcoli.ore_totali.toFixed(1)}h</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadReport(p.id, p.nome, toast)}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Genera Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
