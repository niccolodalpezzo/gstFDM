import { useState } from "react"
import { useLocation } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatEur } from "@/lib/utils"
import type { SpesaUnaTantumCreate, CostoFissoCreate, ProjectCostItem } from "@/types"

const FREQUENCIES = ["Weekly", "Monthly", "Yearly"]

// ─── Non-Recurring Expenses ───────────────────────────────────────────────────

function NonRecurringExpenses() {
  const toast = useToast()

  const { data: spese = [], isLoading } = useQuery({
    queryKey: ["spese-una-tantum"],
    queryFn: api.speseUnaTantum.list,
  })

  const { data: fornitori = [] } = useQuery({
    queryKey: ["fornitori"],
    queryFn: api.fornitori.list,
  })

  const { register, handleSubmit, reset, setValue, watch } = useForm<SpesaUnaTantumCreate>({
    defaultValues: { note: "", data: new Date().toISOString().slice(0, 10), fornitore_id: null },
  })
  
  const selectedFornitoreId = watch("fornitore_id")

  const createMutation = useMutation({
    mutationFn: api.speseUnaTantum.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spese-una-tantum"] })
      reset({ note: "", data: new Date().toISOString().slice(0, 10), fornitore_id: null })
      setValue("fornitore_id", null)
      toast("Expense recorded", "success")
    },
    onError: () => toast("Error saving expense", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.speseUnaTantum.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spese-una-tantum"] })
      toast("Expense deleted", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const total = spese.reduce((s, e) => s + e.importo, 0)

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Register Non-Recurring Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(data => createMutation.mutate(data))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>Description *</Label>
                <Input {...register("descrizione")} required placeholder="e.g. Nozzle replacement kit" />
              </div>
              <div className="space-y-1">
                <Label>Amount (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("importo", { valueAsNumber: true })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" {...register("data")} required />
              </div>
              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select
                  value={selectedFornitoreId ? String(selectedFornitoreId) : "none"}
                  onValueChange={v => setValue("fornitore_id", v === "none" ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {fornitori.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.ragione_sociale}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes / Reference</Label>
              <Input {...register("note")} placeholder="Invoice ref., supplier, etc." />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Record Expense"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <p className="opacity-50 text-sm">Loading...</p>
      ) : spese.length === 0 ? (
        <p className="opacity-50 text-sm">No non-recurring expenses recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {spese.map(e => (
            <Card key={e.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{e.descrizione}</p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    {e.data}
                    {e.fornitore && <span className="ml-2">· {e.fornitore}</span>}
                    {e.note && <span className="ml-2 opacity-70">· {e.note}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-sm tabular-nums" style={{ color: "#ef4444" }}>
                    {formatEur(e.importo)}
                  </span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    description={`Delete expense "${e.descrizione}"?`}
                    onConfirm={() => deleteMutation.mutate(e.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Total non-recurring expenditure
            </p>
            <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{formatEur(total)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Recurring Overhead ───────────────────────────────────────────────────────

function RecurringCosts() {
  const toast = useToast()
  const [frequenza, setFrequenza] = useState("Monthly")

  const { data: costi = [], isLoading } = useQuery({
    queryKey: ["costi-fissi"],
    queryFn: api.costiFissi.list,
  })

  const { register, handleSubmit, reset } = useForm<Omit<CostoFissoCreate, "attivo" | "frequenza">>({
    defaultValues: { data_inizio: new Date().toISOString().slice(0, 10) },
  })

  const createMutation = useMutation({
    mutationFn: (d: Omit<CostoFissoCreate, "attivo" | "frequenza">) =>
      api.costiFissi.create({ ...d, attivo: true, frequenza }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      reset({ data_inizio: new Date().toISOString().slice(0, 10) })
      setFrequenza("Monthly")
      toast("Subscription added", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, attivo }: { id: number; attivo: boolean }) =>
      api.costiFissi.toggle(id, attivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.costiFissi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast("Subscription deleted", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const activeTotal = costi.filter(c => c.attivo).reduce((s, c) => s + c.importo_mensile, 0)

  const freqLabel: Record<string, string> = {
    Weekly: "week",
    Monthly: "month",
    Yearly: "year",
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Recurring Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(d => createMutation.mutate(d))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>Description *</Label>
                <Input {...register("nome")} required placeholder="e.g. Cloud storage, Software license" />
              </div>
              <div className="space-y-1">
                <Label>Amount (€/period) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("importo_mensile", { valueAsNumber: true })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" {...register("data_inizio")} />
              </div>
              <div className="space-y-1">
                <Label>Billing Frequency *</Label>
                <Select value={frequenza} onValueChange={setFrequenza}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Add Subscription"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <p className="opacity-50 text-sm">Loading...</p>
      ) : costi.length === 0 ? (
        <p className="opacity-50 text-sm">No recurring costs registered yet.</p>
      ) : (
        <div className="space-y-2">
          {costi.map(c => (
            <Card key={c.id} className={c.attivo ? "" : "opacity-50"}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={c.attivo}
                    onCheckedChange={checked => toggleMutation.mutate({ id: c.id, attivo: checked })}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{c.nome}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: "rgba(99,102,241,0.1)",
                          color: "var(--accent)",
                        }}
                      >
                        {c.frequenza ?? "Monthly"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                      {formatEur(c.importo_mensile)} / {freqLabel[c.frequenza ?? "Monthly"] ?? "month"}
                      {c.data_inizio && <span className="ml-2">· since {c.data_inizio}</span>}
                    </p>
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  description={`Delete subscription "${c.nome}"?`}
                  onConfirm={() => deleteMutation.mutate(c.id)}
                />
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Active monthly commitment
            </p>
            <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>
              {formatEur(activeTotal)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Project Cost Analysis ────────────────────────────────────────────────────

function marginColor(pct: number) {
  if (pct > 30) return "#22c55e"
  if (pct > 10) return "#f59e0b"
  return "#ef4444"
}

function MarginIndicator({ pct }: { pct: number }) {
  const color = marginColor(pct)
  const Icon = pct > 10 ? TrendingUp : pct > 0 ? Minus : TrendingDown
  return (
    <div className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="font-bold text-sm tabular-nums" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

function CostBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 truncate flex-shrink-0" style={{ color: "var(--muted-text)" }}>{label}</span>
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-16 text-right tabular-nums font-medium flex-shrink-0" style={{ color: "var(--text)" }}>
        {formatEur(value)}
      </span>
    </div>
  )
}

function ProjectCostRow({ item }: { item: ProjectCostItem }) {
  const [expanded, setExpanded] = useState(false)
  const stateColors: Record<string, string> = {
    Design: "rgba(99,102,241,0.15)",
    Prototyping: "rgba(245,158,11,0.15)",
    Production: "rgba(34,197,94,0.15)",
    Completed: "rgba(16,185,129,0.15)",
  }
  const stateTextColors: Record<string, string> = {
    Design: "#6366f1",
    Prototyping: "#f59e0b",
    Production: "#22c55e",
    Completed: "#10b981",
  }

  return (
    <Card>
      <CardContent className="py-0">
        {/* Header row */}
        <button
          className="w-full py-3 flex items-center justify-between gap-3 text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">{item.nome}</p>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                  style={{
                    background: stateColors[item.stato] ?? "rgba(99,102,241,0.1)",
                    color: stateTextColors[item.stato] ?? "#6366f1",
                  }}
                >
                  {item.stato}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                {item.cliente || "—"}
                <span className="mx-1">·</span>
                {item.n_stampe} print job{item.n_stampe !== 1 ? "s" : ""}
                <span className="mx-1">·</span>
                {item.ore_totali}h machine time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>Total Cost</p>
              <p className="font-bold text-sm tabular-nums" style={{ color: "var(--text)" }}>
                {formatEur(item.costo_totale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>Budget</p>
              <p className="font-bold text-sm tabular-nums" style={{ color: "#22c55e" }}>
                {formatEur(item.budget)}
              </p>
            </div>
            <div className="text-right w-16">
              <p className="text-xs mb-0.5" style={{ color: "var(--muted-text)" }}>Margin</p>
              <MarginIndicator pct={item.margine_perc} />
            </div>
            <span className="text-xs opacity-50">{expanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {/* Expanded cost breakdown */}
        {expanded && (
          <div className="pb-4 pt-1 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 mt-2" style={{ color: "var(--muted-text)" }}>
              Cost Breakdown
            </p>
            <CostBar label="Filament / Material" value={item.costo_materiali} total={item.costo_totale} color="#6366f1" />
            <CostBar label="Energy consumption" value={item.costo_energia} total={item.costo_totale} color="#22d3ee" />
            <CostBar label="Machine depreciation" value={item.costo_ammortamento} total={item.costo_totale} color="#f59e0b" />
            <CostBar label="Post-proc. / Accessories" value={item.costo_accessori} total={item.costo_totale} color="#ec4899" />
            <CostBar label="Design / Engineering" value={item.costo_progettazione} total={item.costo_totale} color="#84cc16" />
            <CostBar label="Extra project costs" value={item.costo_extra_progetto} total={item.costo_totale} color="#f97316" />

            <div
              className="flex justify-between items-center pt-2 border-t mt-2"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                Operating Margin
              </span>
              <span
                className="font-bold text-sm tabular-nums"
                style={{ color: marginColor(item.margine_perc) }}
              >
                {formatEur(item.margine)} ({item.margine_perc.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProjectCostAnalysis() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["project-costs"],
    queryFn: api.dashboard.projectCosts,
  })

  const totalBudget = items.reduce((s, i) => s + i.budget, 0)
  const totalCost   = items.reduce((s, i) => s + i.costo_totale, 0)
  const totalMargin = totalBudget - totalCost
  const avgMarginPct = totalBudget > 0 ? (totalMargin / totalBudget) * 100 : 0

  if (isLoading) return <p className="opacity-50 text-sm">Loading...</p>

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Budget", value: formatEur(totalBudget), color: "#22c55e" },
            { label: "Total Cost", value: formatEur(totalCost), color: "#ef4444" },
            { label: "Aggregate Margin", value: `${formatEur(totalMargin)} (${avgMarginPct.toFixed(1)}%)`, color: marginColor(avgMarginPct) },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="py-3 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>{k.label}</p>
                <p className="font-bold text-sm tabular-nums" style={{ color: k.color }}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="opacity-50 text-sm">No projects found. Create a project and log print jobs to see cost analysis.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <ProjectCostRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Financial Management (route-driven) ──────────────────────────────────────

const SECTION_META: Record<string, { label: string; sub: string }> = {
  "expenses":  { label: "Non-Recurring Expenses", sub: "Extraordinary & ad-hoc expenditures" },
  "recurring": { label: "Recurring Overhead",      sub: "Subscriptions & fixed periodic costs" },
  "projects":  { label: "Project Cost Analysis",   sub: "Profitability breakdown per job" },
}

export default function FinancialManagement() {
  const { pathname } = useLocation()
  const segment = pathname.split("/").pop() ?? "expenses"
  const meta = SECTION_META[segment] ?? SECTION_META["expenses"]

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{meta.label}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>{meta.sub}</p>
      </div>

      {segment === "expenses"  && <NonRecurringExpenses />}
      {segment === "recurring" && <RecurringCosts />}
      {segment === "projects"  && <ProjectCostAnalysis />}
    </div>
  )
}
