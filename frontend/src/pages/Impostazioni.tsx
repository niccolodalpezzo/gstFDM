import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useEffect, useState, useMemo, useRef } from "react"
import { useLocation } from "react-router-dom"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { applyTheme } from "@/hooks/useTheme"
import { useToast } from "@/components/ui/toast"
import { PageLayout } from "@/components/layout/PageLayout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Settings, TareOverride, MaterialDensityRatio, MaintenanceTemplate, MaintenanceTemplateCreate, MaterialConfigCreate } from "@/types"
import { FILAMENT_DB, BRAND_NAMES } from "@/data/filament-data"
import { Plus, Trash2, Wrench } from "lucide-react"

// ─── Cost Parameters Section ───────────────────────────────────────────────────

function CostParameters() {
  const toast = useToast()
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get })
  const { register, handleSubmit, reset } = useForm<Settings>()
  useEffect(() => { if (settings) reset(settings) }, [settings, reset])
  const mutation = useMutation({
    mutationFn: api.settings.update,
    onSuccess: (data) => { queryClient.setQueryData(["settings"], data); applyTheme(data); toast("Impostazioni salvate", "success") },
    onError: () => toast("Errore nel salvataggio", "error"),
  })
  if (isLoading) return <p className="opacity-50">Caricamento...</p>
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parametri economici</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(data => mutation.mutate({ ...settings!, ...data }))} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Costo energia €/kWh</Label>
              <Input type="number" step="0.001" min="0" {...register("costo_kwh", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Costo orario post-produzione</Label>
              <Input type="number" step="0.5" min="0" {...register("costo_orario_post_prod", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Costo orario manodopera</Label>
              <Input type="number" step="0.5" min="0" {...register("costo_orario_manodopera", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Costo orario progettazione</Label>
              <Input type="number" step="0.5" min="0" {...register("costo_orario_progettazione_default", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Margine lordo default %</Label>
              <Input type="number" step="0.1" min="0" {...register("margine_lordo_default_perc", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Criterio rischio default</Label>
              <Input {...register("criterio_rischio_default")} placeholder="standard" />
            </div>
            <div className="space-y-1.5">
              <Label>Ore lavorative mensili farm</Label>
              <Input type="number" step="1" min="1" {...register("ore_lavorative_mensili_farm", { valueAsNumber: true })} />
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>Usate per ripartire i costi fissi orari sul cost engine.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Intervallo manutenzione default (ore)</Label>
              <Input type="number" step="1" min="1" {...register("maintenance_interval_hours", { valueAsNumber: true })} />
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>Applicato alle stampanti che non hanno un override dedicato.</p>
            </div>
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Salvataggio..." : "Salva impostazioni"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Maintenance Templates Section ────────────────────────────────────────────

function MaintenanceTemplatesSection() {
  const toast = useToast()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["maintenance-templates"],
    queryFn: api.manutenzioni.listTemplates,
  })

  const [editing, setEditing] = useState<MaintenanceTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<MaintenanceTemplateCreate>({
    nome: "", descrizione: "", soglia_ore_massima: 200, ordine_visualizzazione: 0, attiva: true, costo_standard_intervento: 0,
  })

  const createMutation = useMutation({
    mutationFn: (data: MaintenanceTemplateCreate) => api.manutenzioni.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-templates"] })
      toast("Template creato", "success")
      setShowForm(false)
      setForm({ nome: "", descrizione: "", soglia_ore_massima: 200, ordine_visualizzazione: 0, attiva: true, costo_standard_intervento: 0 })
    },
    onError: (e: Error) => toast(e.message, "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MaintenanceTemplateCreate }) =>
      api.manutenzioni.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-templates"] })
      toast("Template aggiornato", "success")
      setEditing(null)
    },
    onError: (e: Error) => toast(e.message, "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.manutenzioni.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-templates"] })
      toast("Template eliminato", "success")
    },
    onError: (e: Error) => toast(e.message, "error"),
  })

  function openEdit(t: MaintenanceTemplate) {
    setEditing(t)
    setForm({ nome: t.nome, descrizione: t.descrizione, soglia_ore_massima: t.soglia_ore_massima, ordine_visualizzazione: t.ordine_visualizzazione, attiva: t.attiva, costo_standard_intervento: t.costo_standard_intervento })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manutenzioni ordinarie</CardTitle>
            <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
              Template globali di manutenzione. Ogni stampante mostra il progresso in base alle ore accumulate.
            </p>
          </div>
          {!showForm && !editing && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nuovo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Form nuovo / modifica */}
        {(showForm || editing) && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {editing ? "Modifica template" : "Nuovo template"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Lubrificazione assi" />
              </div>
              <div className="space-y-1">
                <Label>Soglia ore (h)</Label>
                <Input type="number" min={1} value={form.soglia_ore_massima} onChange={e => setForm(f => ({ ...f, soglia_ore_massima: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrizione</Label>
              <Input value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Procedura consigliata..." />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="space-y-1">
                <Label>Ordine</Label>
                <Input type="number" min={0} className="w-20" value={form.ordine_visualizzazione} onChange={e => setForm(f => ({ ...f, ordine_visualizzazione: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Costo standard (€)</Label>
                <Input type="number" min={0} step="0.01" className="w-28" value={form.costo_standard_intervento} onChange={e => setForm(f => ({ ...f, costo_standard_intervento: Number(e.target.value) }))} />
              </div>
              <label className="flex items-center gap-2 mt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.attiva}
                  onChange={e => setForm(f => ({ ...f, attiva: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: "var(--text)" }}>Attiva</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={!form.nome || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editing) updateMutation.mutate({ id: editing.id, data: form })
                  else createMutation.mutate(form)
                }}
              >
                {editing ? "Salva" : "Crea template"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditing(null) }}>
                Annulla
              </Button>
            </div>
          </div>
        )}

        {/* Lista templates */}
        {isLoading ? (
          <p className="text-sm opacity-50">Caricamento...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-6 text-center" style={{ borderColor: "var(--card-border)" }}>
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>Nessun template. Creane uno per iniziare.</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
            {[...templates].sort((a, b) => a.ordine_visualizzazione - b.ordine_visualizzazione).map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
                style={{ background: "var(--card-bg)", opacity: t.attiva ? 1 : 0.5 }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{t.nome}</p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Soglia: {t.soglia_ore_massima}h
                    {t.descrizione && ` · ${t.descrizione}`}
                    {!t.attiva && " · Disattivata"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>Modifica</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--error)" }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Density Ratio Section ────────────────────────────────────────────────────

function DensityRatioSection() {
  const toast = useToast()
  const { data: ratios = [] } = useQuery({ queryKey: ["material-density-ratios"], queryFn: api.materialDensityRatios.list })
  const [edits, setEdits] = useState<Record<string, { multiplier: string; notes: string }>>({})
  const [newMat, setNewMat] = useState("")
  const [newMult, setNewMult] = useState("1.0")
  const upsertMutation = useMutation({
    mutationFn: (body: MaterialDensityRatio) => api.materialDensityRatios.upsert(body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["material-density-ratios"] }); toast("Coefficiente salvato", "success") },
    onError: () => toast("Errore nel salvataggio", "error"),
  })
  const deleteMutation = useMutation({
    mutationFn: (material: string) => api.materialDensityRatios.delete(material),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["material-density-ratios"] }); toast("Materiale rimosso", "success") },
    onError: () => toast("Errore", "error"),
  })
  const thCls = "text-left text-xs font-semibold uppercase tracking-wider py-2 px-3"
  const tdCls = "py-2 px-3 text-sm"
  const handleSave = (r: MaterialDensityRatio) => {
    const e = edits[r.material]
    upsertMutation.mutate({ material: r.material, multiplier: e ? Number(e.multiplier) : r.multiplier, notes: e ? e.notes : r.notes })
    setEdits(p => { const n = { ...p }; delete n[r.material]; return n })
  }
  const handleAdd = () => {
    const mat = newMat.trim()
    if (!mat) return
    upsertMutation.mutate({ material: mat, multiplier: Number(newMult) || 1.0, notes: "" })
    setNewMat(""); setNewMult("1.0")
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coefficienti di Consumo Materiale</CardTitle>
        <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>Il PLA è il riferimento (1.0×). I coefficienti vengono applicati al calcolo del costo materiale nei progetti e nella dashboard.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ borderTop: "1px solid var(--card-border)" }}>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            <table className="w-full">
              <thead style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Materiale</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Coefficiente</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Note</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {ratios.map(r => {
                  const e = edits[r.material]
                  const currentMult = e ? Number(e.multiplier) : r.multiplier
                  const isModified = !!e
                  const isNonStd = Math.abs(r.multiplier - 1.0) > 0.001
                  return (
                    <tr key={r.material} style={{ borderTop: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                      <td className={tdCls + " font-medium"} style={{ color: "var(--text)" }}>
                        <div className="flex items-center gap-2">
                          {r.material}
                          {isNonStd && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, background: currentMult > 1 ? "color-mix(in srgb, #f59e0b 15%, transparent)" : "color-mix(in srgb, #6366f1 15%, transparent)", color: currentMult > 1 ? "#f59e0b" : "#6366f1", border: `1px solid ${currentMult > 1 ? "color-mix(in srgb, #f59e0b 30%, transparent)" : "color-mix(in srgb, #6366f1 30%, transparent)"}` }}>
                              {r.multiplier.toFixed(2)}×
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={tdCls}>
                        <input type="number" step="0.01" min="0.1" max="5" value={e?.multiplier ?? r.multiplier} onChange={ev => setEdits(p => ({ ...p, [r.material]: { multiplier: ev.target.value, notes: p[r.material]?.notes ?? r.notes } }))} className="w-20 px-2 py-1 rounded-lg border text-sm text-center bg-transparent outline-none" style={{ borderColor: isModified ? "var(--accent)" : "var(--border)", color: "var(--text)" }} />
                      </td>
                      <td className={tdCls}>
                        <input type="text" value={e?.notes ?? r.notes} placeholder="—" onChange={ev => setEdits(p => ({ ...p, [r.material]: { multiplier: p[r.material]?.multiplier ?? String(r.multiplier), notes: ev.target.value } }))} className="w-full px-2 py-1 rounded-lg border text-sm bg-transparent outline-none" style={{ borderColor: isModified ? "var(--accent)" : "var(--border)", color: "var(--muted-text)" }} />
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-1">
                          {isModified && <Button size="sm" variant="ghost" onClick={() => handleSave(r)}>Salva</Button>}
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(r.material)}><Trash2 className="h-3.5 w-3.5" style={{ color: "var(--muted-text)" }} /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: "1px solid var(--card-border)", background: "color-mix(in srgb, var(--accent) 3%, var(--card-bg))" }}>
            <input type="text" placeholder="Nuovo materiale (es. PA12)" value={newMat} onChange={e => setNewMat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} className="flex-1 px-2 py-1.5 rounded-lg border text-sm bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
            <input type="number" step="0.01" min="0.1" max="5" value={newMult} onChange={e => setNewMult(e.target.value)} className="w-20 px-2 py-1.5 rounded-lg border text-sm text-center bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--text)" }} />
            <Button size="sm" onClick={handleAdd} disabled={!newMat.trim()}><Plus className="h-3.5 w-3.5 mr-1" />Aggiungi</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Configurazione Materiali Preventivi ─────────────────────────────────────

function QuoteMaterialConfigSection() {
  const toast = useToast()
  const { data: configs = [] } = useQuery({
    queryKey: ["preventivi-material-configs"],
    queryFn: api.preventivi.materialConfigs.list,
  })

  const [newConfig, setNewConfig] = useState<MaterialConfigCreate>({
    materiale: "",
    marca: "",
    scarto_predefinito_perc: 0,
    energy_multiplier: 1,
    risk_perc_base: 0,
    note: "",
  })

  const upsertMutation = useMutation({
    mutationFn: api.preventivi.materialConfigs.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivi-material-configs"] })
      toast("Configurazione materiale salvata", "success")
      setNewConfig({ materiale: "", marca: "", scarto_predefinito_perc: 0, energy_multiplier: 1, risk_perc_base: 0, note: "" })
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nel salvataggio", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.preventivi.materialConfigs.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivi-material-configs"] })
      toast("Configurazione materiale eliminata", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nell'eliminazione", "error"),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurazione materiali per preventivi</CardTitle>
        <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
          Scarto predefinito, moltiplicatore energia e rischio base usati dal cost engine preventivi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--card-border)" }}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <Label>Materiale</Label>
              <Input value={newConfig.materiale} onChange={event => setNewConfig(current => ({ ...current, materiale: event.target.value }))} placeholder="PLA, PETG, ABS..." />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={newConfig.marca} onChange={event => setNewConfig(current => ({ ...current, marca: event.target.value }))} placeholder="Vuoto = regola generica" />
            </div>
            <div className="space-y-1">
              <Label>Scarto predefinito %</Label>
              <Input type="number" min="0" step="0.1" value={newConfig.scarto_predefinito_perc} onChange={event => setNewConfig(current => ({ ...current, scarto_predefinito_perc: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Moltiplicatore energia</Label>
              <Input type="number" min="0" step="0.01" value={newConfig.energy_multiplier} onChange={event => setNewConfig(current => ({ ...current, energy_multiplier: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Rischio base %</Label>
              <Input type="number" min="0" step="0.1" value={newConfig.risk_perc_base} onChange={event => setNewConfig(current => ({ ...current, risk_perc_base: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input value={newConfig.note} onChange={event => setNewConfig(current => ({ ...current, note: event.target.value }))} placeholder="Uso tecnico, camera calda, supporti..." />
            </div>
          </div>
          <Button onClick={() => upsertMutation.mutate(newConfig)} disabled={!newConfig.materiale.trim() || upsertMutation.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Salva configurazione
          </Button>
        </div>

        <div className="space-y-2">
          {configs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>Nessuna configurazione materiale registrata.</p>
          ) : (
            configs.map(config => (
              <div key={config.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--card-border)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {config.materiale}
                    {config.marca ? ` · ${config.marca}` : " · Generica"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Scarto {config.scarto_predefinito_perc}% · Energia x{config.energy_multiplier.toFixed(2)} · Rischio {config.risk_perc_base}%
                    {config.note ? ` · ${config.note}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(config.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Tare Configuration Section ───────────────────────────────────────────────

function TareConfigSection() {
  const toast = useToast()
  const { data: overrides = [] } = useQuery({ queryKey: ["tare-overrides"], queryFn: api.tareOverrides.list })
  const overrideMap = useMemo(() => Object.fromEntries(overrides.map(o => [`${o.marca}|${o.materiale}`, o.tare_g])), [overrides])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const upsertMutation = useMutation({
    mutationFn: (body: TareOverride) => api.tareOverrides.upsert(body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tare-overrides"] }); toast("Tara salvata", "success") },
    onError: () => toast("Errore nel salvataggio", "error"),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ marca, materiale }: { marca: string; materiale: string }) => api.tareOverrides.delete(marca, materiale),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tare-overrides"] }); toast("Tara ripristinata", "success") },
    onError: () => toast("Errore", "error"),
  })
  const thCls = "text-left text-xs font-semibold uppercase tracking-wider py-2 px-3"
  const tdCls = "py-2 px-3 text-sm"
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurazione tare bobine</CardTitle>
        <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>Override del peso a vuoto per marca/materiale. Serve a calcolare il netto residuo dal peso lordo letto sulla bilancia.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden" style={{ borderTop: "1px solid var(--card-border)" }}>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            <table className="w-full">
              <thead style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Marca</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Materiale</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Tipo bobina</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Default (g)</th>
                  <th className={thCls} style={{ color: "var(--muted-text)" }}>Tara custom (g)</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {BRAND_NAMES.flatMap(brand =>
                  FILAMENT_DB[brand].materials.map((material, mi) => {
                    const key = `${brand}|${material}`
                    const hasOverride = key in overrideMap
                    const editVal = edits[key]
                    return (
                      <tr key={key} style={{ borderTop: "1px solid var(--card-border)", background: hasOverride ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "var(--card-bg)" }}>
                        <td className={tdCls + " font-medium"} style={{ color: "var(--text)" }}>{mi === 0 ? brand : ""}</td>
                        <td className={tdCls} style={{ color: "var(--muted-text)" }}>{material}</td>
                        <td className={tdCls + " text-xs"} style={{ color: "var(--muted-text)" }}>{mi === 0 ? FILAMENT_DB[brand].spoolType : ""}</td>
                        <td className={tdCls + " tabular-nums"} style={{ color: "var(--muted-text)" }}>{FILAMENT_DB[brand].defaultTare}g</td>
                        <td className={tdCls}>
                          <input type="number" min="0" step="1" placeholder={String(FILAMENT_DB[brand].defaultTare)} value={editVal ?? (hasOverride ? String(overrideMap[key]) : "")} onChange={e => setEdits(p => ({ ...p, [key]: e.target.value }))} className="w-20 px-2 py-1 rounded-lg border text-sm text-center bg-transparent outline-none" style={{ borderColor: hasOverride ? "var(--accent)" : "var(--border)", color: "var(--text)" }} />
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1">
                            {editVal !== undefined && editVal !== "" && (
                              <Button size="sm" variant="ghost" onClick={() => { upsertMutation.mutate({ marca: brand, materiale: material, tare_g: Number(editVal) }); setEdits(p => { const n = { ...p }; delete n[key]; return n }) }}>Salva</Button>
                            )}
                            {hasOverride && (
                              <Button size="sm" variant="ghost" onClick={() => { deleteMutation.mutate({ marca: brand, materiale: material }); setEdits(p => { const n = { ...p }; delete n[key]; return n }) }}>Reset</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "generali",               label: "Generali" },
  { id: "manutenzioni-ordinarie", label: "Manutenzioni ordinarie" },
  { id: "filamenti",              label: "Filamenti" },
] as const

export default function Impostazioni() {
  const { hash } = useLocation()
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Scroll to hash on mount/hash change
  useEffect(() => {
    const id = hash.replace("#", "")
    if (id && sectionRefs.current[id]) {
      setTimeout(() => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [hash])

  return (
    <PageLayout
      title="Impostazioni"
      description="Configurazione globale della farm, parametri cost engine, manutenzioni e tabelle materiali."
    >
      <div className="flex gap-6">
        <nav className="hidden lg:flex flex-col gap-1 w-52 shrink-0 pt-1 self-start sticky top-6">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-[var(--hover-bg)]"
              style={{ color: hash === `#${s.id}` ? "var(--accent)" : "var(--muted-text)", fontWeight: hash === `#${s.id}` ? 600 : 500 }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex-1 max-w-3xl space-y-10">
          <section ref={el => { sectionRefs.current["generali"] = el }} id="generali">
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>Generali</h3>
            <CostParameters />
          </section>

          <section ref={el => { sectionRefs.current["manutenzioni-ordinarie"] = el }} id="manutenzioni-ordinarie">
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>Manutenzioni ordinarie</h3>
            <MaintenanceTemplatesSection />
          </section>

          <section ref={el => { sectionRefs.current["filamenti"] = el }} id="filamenti">
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>Filamenti</h3>
            <div className="space-y-4">
              <DensityRatioSection />
              <QuoteMaterialConfigSection />
              <TareConfigSection />
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}
