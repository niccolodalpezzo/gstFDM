import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Package, Wrench } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { formatEur } from "@/lib/utils"
import type { ChartItem, PrinterMaintenanceStatus, ScortaItem } from "@/types"

// ─── Constants ───────────────────────────────────────────────────────────────

type FilterMode = "monthly" | "annual" | "custom"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const YEARS = [2024, 2025, 2026]

const PALETTE_MATERIAL = ["#6366f1","#22d3ee","#f59e0b","#ec4899","#84cc16","#f97316","#06b6d4"]
const PALETTE_MACHINE  = ["#10b981","#f97316","#8b5cf6","#06b6d4","#ef4444","#eab308"]

const inputCls = "px-3 py-1.5 rounded-lg text-sm outline-none border transition-colors"

// ─── Financial Overview KPI ───────────────────────────────────────────────────

function FinancialOverview({ revenue, expenditure }: { revenue: number; expenditure: number }) {
  const margin = revenue - expenditure
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0
  const isPositive = margin >= 0

  return (
    <div
      className="rounded-xl overflow-hidden grid grid-cols-3 shadow-sm"
      style={{ border: "1px solid var(--card-border)" }}
    >
      {/* REVENUE */}
      <div
        className="flex flex-col items-center justify-center py-6 px-4 gap-1"
        style={{ background: "rgba(34,197,94,0.07)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4" style={{ color: "#22c55e" }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#22c55e" }}>
            Revenue
          </span>
        </div>
        <span className="text-2xl font-bold tabular-nums" style={{ color: "#22c55e" }}>
          {formatEur(revenue)}
        </span>
        <span className="text-xs" style={{ color: "var(--muted-text)" }}>Gross income</span>
      </div>

      {/* EXPENDITURE */}
      <div
        className="flex flex-col items-center justify-center py-6 px-4 gap-1"
        style={{
          background: "rgba(239,68,68,0.07)",
          borderLeft: "1px solid var(--card-border)",
          borderRight: "1px solid var(--card-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-4 w-4" style={{ color: "#ef4444" }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#ef4444" }}>
            Expenditure
          </span>
        </div>
        <span className="text-2xl font-bold tabular-nums" style={{ color: "#ef4444" }}>
          {formatEur(expenditure)}
        </span>
        <span className="text-xs" style={{ color: "var(--muted-text)" }}>Operational costs</span>
      </div>

      {/* OPERATING MARGIN */}
      <div
        className="flex flex-col items-center justify-center py-6 px-4 gap-1"
        style={{ background: isPositive ? "rgba(99,102,241,0.07)" : "rgba(239,68,68,0.05)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4" style={{ color: isPositive ? "#6366f1" : "#ef4444" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: isPositive ? "#6366f1" : "#ef4444" }}
          >
            Operating Margin
          </span>
        </div>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: isPositive ? "#6366f1" : "#ef4444" }}
        >
          {formatEur(margin)}
        </span>
        <span className="text-xs" style={{ color: "var(--muted-text)" }}>
          {marginPct.toFixed(1)}% margin ratio
        </span>
      </div>
    </div>
  )
}

// ─── Pie Chart Card ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, unit }: { active?: boolean; payload?: {name: string; value: number}[]; unit: string }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs shadow-lg"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        color: "var(--text)",
      }}
    >
      <p className="font-semibold mb-0.5">{name}</p>
      <p style={{ color: "var(--accent)" }}>
        {typeof value === "number" ? value.toLocaleString("it-IT") : value} {unit}
      </p>
    </div>
  )
}

function AnalyticsPieChart({
  title,
  subtitle,
  data,
  palette,
  unit,
}: {
  title: string
  subtitle: string
  data: ChartItem[]
  palette: string[]
  unit: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return (
      <Card className="flex-1 min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <p className="text-xs" style={{ color: "var(--muted-text)" }}>{subtitle}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm py-10 text-center" style={{ color: "var(--muted-text)" }}>
            No data for selected period
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs" style={{ color: "var(--muted-text)" }}>{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0" style={{ width: 150, height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip unit={unit} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: palette[i % palette.length] }}
                  />
                  <span className="truncate" style={{ color: "var(--text)" }}>{d.name}</span>
                </div>
                <span className="font-semibold tabular-nums flex-shrink-0 ml-2" style={{ color: "var(--muted-text)" }}>
                  {d.value.toLocaleString("it-IT")}{unit}
                  <span className="ml-1 opacity-55 font-normal">
                    ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────

function LowStockAlerts({ scorte }: { scorte: ScortaItem[] }) {
  const critical = scorte.filter(s => s.sotto_soglia)
  const adequate  = scorte.filter(s => !s.sotto_soglia)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: "#f97316" }} />
          Low Stock Alerts
        </CardTitle>
        {critical.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
            style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}
          >
            {critical.length} critical
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-auto">
        {scorte.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Package className="h-8 w-8 opacity-25" />
            <p className="text-xs text-center" style={{ color: "var(--muted-text)" }}>
              No active spools tracked
            </p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#f97316" }}>
                  Below Threshold
                </p>
                {critical.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg mb-1"
                    style={{ background: "rgba(249,115,22,0.08)" }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#f97316" }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{s.nome}</p>
                        <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                          threshold: {s.soglia}g
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: "#f97316" }}>
                      {s.grammi_residui}g
                    </span>
                  </div>
                ))}
              </div>
            )}
            {adequate.length > 0 && (
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-text)" }}
                >
                  Adequate Stock ({adequate.length})
                </p>
                {adequate.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg mb-1"
                    style={{ background: "var(--muted-bg)" }}
                  >
                    <p className="text-xs truncate" style={{ color: "var(--text)" }}>{s.nome}</p>
                    <span className="text-xs font-semibold tabular-nums flex-shrink-0 ml-2" style={{ color: "var(--muted-text)" }}>
                      {s.grammi_residui}g
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Maintenance Alerts Widget ────────────────────────────────────────────────

const MAINT_STATO_META = {
  warning: { color: "#f59e0b", label: "In scadenza" },
  due:     { color: "#ef4444", label: "Scaduta" },
} as const

function MaintenanceAlertsWidget({ alerts }: { alerts: PrinterMaintenanceStatus[] }) {
  const navigate = useNavigate()

  return (
    <Card
      className="flex flex-col"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Wrench className="h-4 w-4" style={{ color: "var(--accent)" }} />
          Manutenzioni in scadenza
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pb-3 space-y-1">
        {alerts.length === 0 ? (
          <p className="text-xs py-2 text-center" style={{ color: "var(--muted-text)" }}>
            Tutte le manutenzioni sono ok
          </p>
        ) : (
          alerts.map(ps => (
            <div
              key={ps.printer_id}
              className="rounded-lg px-3 py-2 cursor-pointer transition-opacity hover:opacity-80"
              style={{
                background: ps.worst_stato === "due" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
              }}
              onClick={() => navigate(`/stampanti/manutenzioni`)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                  {ps.printer_nome}
                </p>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: MAINT_STATO_META[ps.worst_stato as "warning" | "due"]?.color ?? "#94a3b8" }}
                >
                  {MAINT_STATO_META[ps.worst_stato as "warning" | "due"]?.label}
                </span>
              </div>
              {ps.items.filter(i => i.stato !== "ok").slice(0, 2).map(item => (
                <p key={item.template_id} className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-text)" }}>
                  · {item.template_nome}: {item.elapsed_hours.toFixed(1)}h / {item.soglia_ore_massima}h
                </p>
              ))}
              <button
                className="mt-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: "var(--accent)" }}
                onClick={e => {
                  e.stopPropagation()
                  navigate(`/produzione/pianificazione?categoria=manutenzione&printer_id=${ps.printer_id}`)
                }}
              >
                Pianifica →
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const now = new Date()
  const [mode, setMode] = useState<FilterMode>("monthly")
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [year, setYear]     = useState(now.getFullYear())
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`)
  const [dateTo, setDateTo]     = useState(now.toISOString().slice(0, 10))

  const inputStyle = {
    background: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text)",
  }

  // Map UI mode → API mode param
  const apiMode = mode === "monthly" ? "mese" : mode === "annual" ? "anno" : "periodo"

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { mode: apiMode }
    if (mode === "monthly") { p.mese = month; p.anno = year }
    if (mode === "annual")  { p.anno = year }
    if (mode === "custom")  { p.dal = dateFrom; p.al = dateTo }
    return p
  }, [mode, month, year, dateFrom, dateTo, apiMode])

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "analytics", queryParams],
    queryFn: () => api.dashboard.analytics(queryParams),
  })

  const { data: maintenanceAlerts = [] } = useQuery({
    queryKey: ["manutenzioni", "dashboard-alerts"],
    queryFn: api.manutenzioni.dashboardAlerts,
    staleTime: 60_000,
  })

  const filterLabels: Record<FilterMode, string> = {
    monthly: "Monthly",
    annual: "Annual",
    custom: "Custom Range",
  }

  return (
    <div className="flex flex-col h-full gap-5">

      {/* ── Control Panel ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Operations Dashboard
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
            Additive Manufacturing — Financial & Resource Analytics
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {(["monthly", "annual", "custom"] as FilterMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 text-sm transition-colors"
                style={{
                  background: mode === m ? "var(--accent)" : "var(--card-bg)",
                  color: mode === m ? "#fff" : "var(--text)",
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                {filterLabels[m]}
              </button>
            ))}
          </div>

          {mode === "monthly" && (
            <>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className={inputCls}
                style={inputStyle}
              >
                {MONTHS.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className={inputCls}
                style={inputStyle}
              >
                {YEARS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          )}

          {mode === "annual" && (
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className={inputCls}
              style={inputStyle}
            >
              {YEARS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {mode === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>Start</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
              <span className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>End</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center opacity-40 text-sm">
          Loading analytics...
        </div>
      ) : (
        <div className="flex gap-5 flex-1 min-h-0">

          {/* Main column */}
          <div className="flex flex-col flex-1 min-w-0 gap-4">

            {/* Financial Overview */}
            <FinancialOverview
              revenue={data?.entrate ?? 0}
              expenditure={data?.uscite ?? 0}
            />

            {/* Analytics Charts */}
            <div className="flex gap-4" style={{ minHeight: 230 }}>
              <AnalyticsPieChart
                title="Material Consumption"
                subtitle="Polymer usage by filament type"
                data={data?.materiali ?? []}
                palette={PALETTE_MATERIAL}
                unit="g"
              />
              <AnalyticsPieChart
                title="Machine Duty Cycle"
                subtitle="Active print hours per machine"
                data={data?.stampanti ?? []}
                palette={PALETTE_MACHINE}
                unit="h"
              />
            </div>
          </div>

          {/* Right panel: Supply Chain + Maintenance */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">
            <LowStockAlerts scorte={data?.scorte ?? []} />
            <MaintenanceAlertsWidget alerts={maintenanceAlerts} />
          </div>
        </div>
      )}
    </div>
  )
}
