import { useState } from "react"
import { useLocation } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { PageLayout } from "@/components/layout/PageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Trash2, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import { formatEur } from "@/lib/utils"
import type { SpesaUnaTantumCreate, CostoFissoCreate, ProjectCostItem, CostoStraordinarioStrutturaCreate } from "@/types"

const FREQUENZE = [
  { value: "Weekly",  label: "Settimanale" },
  { value: "Monthly", label: "Mensile" },
  { value: "Yearly",  label: "Annuale" },
]

// ─── Spese Straordinarie ──────────────────────────────────────────────────────

function SpeseUnaTantum() {
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
      toast("Spesa registrata", "success")
    },
    onError: () => toast("Errore nel salvataggio", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.speseUnaTantum.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spese-una-tantum"] })
      toast("Spesa eliminata", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const total = spese.reduce((s, e) => s + e.importo, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registra Spesa Straordinaria</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(data => createMutation.mutate(data))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>Descrizione *</Label>
                <Input {...register("descrizione")} required placeholder="es. Kit sostituzione ugello" />
              </div>
              <div className="space-y-1">
                <Label>Importo (€) *</Label>
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
                <Label>Data *</Label>
                <Input type="date" {...register("data")} required />
              </div>
              <div className="space-y-1">
                <Label>Fornitore</Label>
                <Select
                  value={selectedFornitoreId ? String(selectedFornitoreId) : "none"}
                  onValueChange={v => setValue("fornitore_id", v === "none" ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleziona fornitore..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nessuno —</SelectItem>
                    {fornitori.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.ragione_sociale}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note / Riferimento</Label>
              <Input {...register("note")} placeholder="Rif. fattura, fornitore, ecc." />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvataggio..." : "Registra Spesa"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="opacity-50 text-sm">Caricamento...</p>
      ) : spese.length === 0 ? (
        <p className="opacity-50 text-sm">Nessuna spesa straordinaria registrata.</p>
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
                    description={`Eliminare la spesa "${e.descrizione}"?`}
                    onConfirm={() => deleteMutation.mutate(e.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Totale spese straordinarie
            </p>
            <p className="text-xl font-bold" style={{ color: "#ef4444" }}>{formatEur(total)}</p>
          </div>
        </div>
      )}

      <CostiStraordinariStruttura />
    </div>
  )
}

function CostiStraordinariStruttura() {
  const toast = useToast()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["costi-struttura"],
    queryFn: api.preventivi.structureCosts.list,
  })

  const { register, handleSubmit, reset } = useForm<CostoStraordinarioStrutturaCreate>({
    defaultValues: {
      descrizione: "",
      importo_totale: 0,
      importo_residuo: undefined,
      quota_oraria: 0,
      ore_da_spalmare_totali: undefined,
      ore_da_spalmare_residue: undefined,
      attivo: true,
      data: new Date().toISOString().slice(0, 10),
      note: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: api.preventivi.structureCosts.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-struttura"] })
      reset({
        descrizione: "",
        importo_totale: 0,
        importo_residuo: undefined,
        quota_oraria: 0,
        ore_da_spalmare_totali: undefined,
        ore_da_spalmare_residue: undefined,
        attivo: true,
        data: new Date().toISOString().slice(0, 10),
        note: "",
      })
      toast("Costo struttura registrato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nel salvataggio", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.preventivi.structureCosts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-struttura"] })
      toast("Costo struttura eliminato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nell'eliminazione", "error"),
  })

  const totaleResiduo = items.filter(item => item.attivo).reduce((sum, item) => sum + item.importo_residuo, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Costi straordinari di struttura</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>Descrizione *</Label>
                <Input {...register("descrizione")} required placeholder="Es. Upgrade quadro elettrico, accessorio farm, banco tecnico" />
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" {...register("data")} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Importo totale</Label>
                <Input type="number" step="0.01" min="0" {...register("importo_totale", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Importo residuo</Label>
                <Input type="number" step="0.01" min="0" {...register("importo_residuo", { setValueAs: value => value === "" ? undefined : Number(value) })} />
              </div>
              <div className="space-y-1">
                <Label>Quota oraria</Label>
                <Input type="number" step="0.0001" min="0" {...register("quota_oraria", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Ore da spalmare</Label>
                <Input type="number" step="0.1" min="0" {...register("ore_da_spalmare_totali", { setValueAs: value => value === "" ? undefined : Number(value) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input {...register("note")} placeholder="Facoltativo" />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvataggio..." : "Aggiungi costo struttura"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="opacity-50 text-sm">Caricamento...</p>
      ) : items.length === 0 ? (
        <p className="opacity-50 text-sm">Nessun costo straordinario di struttura registrato.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className={item.attivo ? "" : "opacity-55"}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{item.descrizione}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: item.attivo ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)", color: item.attivo ? "#22c55e" : "#94a3b8" }}>
                      {item.attivo ? "Attivo" : "Esaurito"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Residuo {formatEur(item.importo_residuo)} su {formatEur(item.importo_totale)}
                    <span className="mx-1">·</span>
                    Quota {formatEur(item.quota_oraria)}/h
                    {item.ore_da_spalmare_residue != null && (
                      <>
                        <span className="mx-1">·</span>
                        Ore residue {item.ore_da_spalmare_residue.toFixed(1)}
                      </>
                    )}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  description={`Eliminare il costo struttura "${item.descrizione}"?`}
                  onConfirm={() => deleteMutation.mutate(item.id)}
                />
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Residuo attivo da recuperare
            </p>
            <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>{formatEur(totaleResiduo)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Costi Fissi Ricorrenti ───────────────────────────────────────────────────

function CostiFissi() {
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
      toast("Costo fisso aggiunto", "success")
    },
    onError: () => toast("Errore", "error"),
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
      toast("Costo fisso eliminato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const activeTotal = costi.filter(c => c.attivo).reduce((s, c) => s + c.importo_mensile, 0)

  const freqLabel: Record<string, string> = {
    Weekly: "settimana",
    Monthly: "mese",
    Yearly: "anno",
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuovo Costo Fisso</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(d => createMutation.mutate(d))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>Descrizione *</Label>
                <Input {...register("nome")} required placeholder="es. Affitto locale, Software, Utenze" />
              </div>
              <div className="space-y-1">
                <Label>Importo (€/periodo) *</Label>
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
                <Label>Data inizio</Label>
                <Input type="date" {...register("data_inizio")} />
              </div>
              <div className="space-y-1">
                <Label>Frequenza *</Label>
                <Select value={frequenza} onValueChange={setFrequenza}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENZE.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvataggio..." : "Aggiungi Costo Fisso"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="opacity-50 text-sm">Caricamento...</p>
      ) : costi.length === 0 ? (
        <p className="opacity-50 text-sm">Nessun costo fisso registrato.</p>
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
                        {FREQUENZE.find(f => f.value === (c.frequenza ?? "Monthly"))?.label ?? "Mensile"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                      {formatEur(c.importo_mensile)} / {freqLabel[c.frequenza ?? "Monthly"] ?? "mese"}
                      {c.data_inizio && <span className="ml-2">· dal {c.data_inizio}</span>}
                    </p>
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  description={`Eliminare il costo fisso "${c.nome}"?`}
                  onConfirm={() => deleteMutation.mutate(c.id)}
                />
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Impegno mensile attivo
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

// ─── Pricing / Analisi Costi Progetto ─────────────────────────────────────────

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
      <span className="w-36 truncate flex-shrink-0" style={{ color: "var(--muted-text)" }}>{label}</span>
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
    Progettazione: "rgba(99,102,241,0.15)",
    Prototipazione: "rgba(245,158,11,0.15)",
    Produzione: "rgba(34,197,94,0.15)",
    Terminato: "rgba(16,185,129,0.15)",
  }
  const stateTextColors: Record<string, string> = {
    Progettazione: "#6366f1",
    Prototipazione: "#f59e0b",
    Produzione: "#22c55e",
    Terminato: "#10b981",
  }
  const quantita = item.quantita_da_produrre ?? 1

  return (
    <Card>
      <CardContent className="py-0">
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
                {item.has_estimated_logs && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 flex items-center gap-1"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}
                    title="Alcuni log non hanno snapshot storico — costi calcolati al momento attuale"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Stimato
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                {item.cliente || "—"}
                <span className="mx-1">·</span>
                {item.n_stampe} {item.n_stampe !== 1 ? "stampe" : "stampa"}
                <span className="mx-1">·</span>
                {item.ore_totali}h macchina
                {quantita > 1 && (
                  <>
                    <span className="mx-1">·</span>
                    {quantita} pz
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>Costo Totale</p>
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
              <p className="text-xs mb-0.5" style={{ color: "var(--muted-text)" }}>Margine</p>
              <MarginIndicator pct={item.margine_perc} />
            </div>
            <span className="text-xs opacity-50">{expanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {expanded && (
          <div className="pb-4 pt-1 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 mt-2" style={{ color: "var(--muted-text)" }}>
              Dettaglio Costi
            </p>
            <CostBar label="Materiale / Filamento" value={item.costo_materiali} total={item.costo_totale} color="#6366f1" />
            <CostBar label="Energia" value={item.costo_energia} total={item.costo_totale} color="#22d3ee" />
            <CostBar label="Ammortamento macchina" value={item.costo_ammortamento} total={item.costo_totale} color="#f59e0b" />
            <CostBar label="Quota manutenzione" value={item.quota_manutenzione ?? 0} total={item.costo_totale} color="#a78bfa" />
            <CostBar label="Overhead fissi" value={item.quota_overhead ?? 0} total={item.costo_totale} color="#64748b" />
            <CostBar label="Allocazioni attive" value={item.quota_allocazioni ?? 0} total={item.costo_totale} color="#94a3b8" />
            <CostBar label="Post-prod. / Accessori" value={item.costo_accessori} total={item.costo_totale} color="#ec4899" />
            <CostBar label="Progettazione / Extra" value={item.costo_progettazione} total={item.costo_totale} color="#84cc16" />

            <div className="pt-2 border-t mt-2 space-y-1.5" style={{ borderColor: "var(--border)" }}>
              {quantita > 1 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Costo unitario ({quantita} pz)
                  </span>
                  <span className="font-semibold text-sm tabular-nums" style={{ color: "var(--text)" }}>
                    {formatEur(item.costo_unitario ?? 0)} / pz
                  </span>
                </div>
              )}
              {quantita > 1 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Margine unitario
                  </span>
                  <span className="font-semibold text-sm tabular-nums" style={{ color: marginColor(item.margine_perc) }}>
                    {formatEur(item.margine_unitario ?? 0)} / pz
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                  Margine operativo
                </span>
                <span
                  className="font-bold text-sm tabular-nums"
                  style={{ color: marginColor(item.margine_perc) }}
                >
                  {formatEur(item.margine)} ({item.margine_perc.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AnalisiCostiProgetti() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["project-costs"],
    queryFn: api.dashboard.projectCosts,
  })

  const totalBudget = items.reduce((s, i) => s + i.budget, 0)
  const totalCost   = items.reduce((s, i) => s + i.costo_totale, 0)
  const totalMargin = totalBudget - totalCost
  const avgMarginPct = totalBudget > 0 ? (totalMargin / totalBudget) * 100 : 0

  if (isLoading) return <p className="opacity-50 text-sm">Caricamento...</p>

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Budget Totale", value: formatEur(totalBudget), color: "#22c55e" },
            { label: "Costo Totale", value: formatEur(totalCost), color: "#ef4444" },
            { label: "Margine Aggregato", value: `${formatEur(totalMargin)} (${avgMarginPct.toFixed(1)}%)`, color: marginColor(avgMarginPct) },
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
        <p className="opacity-50 text-sm">Nessun progetto trovato. Crea un progetto e registra stampe per vedere l'analisi costi.</p>
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
  "spese-straordinarie": { label: "Spese straordinarie", sub: "Costi una tantum e uscite eccezionali" },
  "fissi": { label: "Costi fissi", sub: "Overhead ricorrenti e impegni periodici" },
  "pricing": { label: "Analisi Costi e Pricing", sub: "Marginalità e breakdown costi per ordine/progetto" },
}

export default function FinancialManagement() {
  const { pathname } = useLocation()
  const rawSegment = pathname.split("/").pop() ?? "spese-straordinarie"
  const legacyMap: Record<string, string> = {
    expenses: "spese-straordinarie",
    recurring: "fissi",
    projects: "pricing",
  }
  const segment = legacyMap[rawSegment] ?? rawSegment
  const meta = SECTION_META[segment] ?? SECTION_META["spese-straordinarie"]

  return (
    <PageLayout title={meta.label} description={meta.sub}>
      {segment === "spese-straordinarie" && <SpeseUnaTantum />}
      {segment === "fissi" && <CostiFissi />}
      {segment === "pricing" && <AnalisiCostiProgetti />}
    </PageLayout>
  )
}
