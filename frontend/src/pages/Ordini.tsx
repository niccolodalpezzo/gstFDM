import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Ordine, OrdineListItem, OrdineStato, Stampante, BobinaFilamento } from "@/types"
import { ConfigCheckBanner } from "@/components/shared/ConfigCheckBanner"
import { useToast } from "@/components/ui/toast"
import {
  ClipboardList, Upload, FileBox, Cpu, Truck, Trash2, Play, CheckCircle2,
  XCircle, ChevronRight, Package, Settings2, PlusCircle, Eye,
} from "lucide-react"

const STATO_CONFIG: Record<OrdineStato, { label: string; color: string }> = {
  nuovo: { label: "Nuovo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_lavorazione: { label: "In Lavorazione", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  completato: { label: "Completato", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  spedito: { label: "Spedito", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  chiuso: { label: "Chiuso", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
}

function StatoBadge({ stato }: { stato: OrdineStato }) {
  const cfg = STATO_CONFIG[stato] || STATO_CONFIG.nuovo
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmt(n: number) { return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function Ordini() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterStato, setFilterStato] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"dettaglio" | "file" | "job" | "spedizione">("dettaglio")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: ordini = [] } = useQuery({ queryKey: ["ordini", filterStato], queryFn: () => api.ordini.list(filterStato ? { stato: filterStato } : undefined) })
  const { data: ordine } = useQuery({ queryKey: ["ordine", selectedId], queryFn: () => api.ordini.get(selectedId!), enabled: !!selectedId })
  const { data: stampanti = [] } = useQuery<Stampante[]>({ queryKey: ["stampanti"], queryFn: api.stampanti.list })
  const { data: materiali = [] } = useQuery<BobinaFilamento[]>({ queryKey: ["magazzino"], queryFn: api.magazzino.list })

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["ordini"] })
    if (selectedId) qc.invalidateQueries({ queryKey: ["ordine", selectedId] })
  }, [qc, selectedId])

  const uploadMut = useMutation({
    mutationFn: (file: File) => api.ordini.uploadFile(selectedId!, file),
    onSuccess: () => { invalidate(); toast({ title: "File caricato" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const updateFileMut = useMutation({
    mutationFn: ({ fileId, body }: { fileId: number; body: Record<string, unknown> }) =>
      api.ordini.updateFile(selectedId!, fileId, body as never),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const deleteFileMut = useMutation({
    mutationFn: (fileId: number) => api.ordini.deleteFile(selectedId!, fileId),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const genJobsMut = useMutation({
    mutationFn: (fileId: number) => api.ordini.generateJobs(selectedId!, fileId),
    onSuccess: () => { invalidate(); toast({ title: "Job generati" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const transitionMut = useMutation({
    mutationFn: (stato: string) => api.ordini.transition(selectedId!, stato),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const deleteOrdMut = useMutation({
    mutationFn: () => api.ordini.delete(selectedId!),
    onSuccess: () => { setSelectedId(null); invalidate() },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  // Job actions
  const jobStartMut = useMutation({ mutationFn: (id: number) => api.jobs.start(id), onSuccess: invalidate, onError: (e: Error) => toast({ title: e.message, variant: "destructive" }) })
  const jobCancelMut = useMutation({ mutationFn: (id: number) => api.jobs.cancel(id), onSuccess: invalidate, onError: (e: Error) => toast({ title: e.message, variant: "destructive" }) })
  const [completingJobId, setCompletingJobId] = useState<number | null>(null)
  const [completeForm, setCompleteForm] = useState({ tempo_effettivo_minuti: 0, grammi_effettivi: 0, note: "" })
  const jobCompleteMut = useMutation({
    mutationFn: () => api.jobs.complete(completingJobId!, completeForm),
    onSuccess: () => { setCompletingJobId(null); invalidate() },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  // Spedizione
  const [showShipForm, setShowShipForm] = useState(false)
  const [shipForm, setShipForm] = useState({ corriere: "", costo_spedizione: 0, costo_packing: 0, peso_kg: 0, indirizzo_destinazione: "", note: "" })
  const createShipMut = useMutation({
    mutationFn: () => api.spedizioni.create({ ordine_id: selectedId!, ...shipForm }),
    onSuccess: () => { setShowShipForm(false); invalidate(); toast({ title: "Spedizione creata" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })
  const markShippedMut = useMutation({
    mutationFn: ({ id, tracking, corriere }: { id: number; tracking: string; corriere: string }) =>
      api.spedizioni.ship(id, { codice_tracking: tracking, corriere }),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })
  const markDeliveredMut = useMutation({
    mutationFn: (id: number) => api.spedizioni.deliver(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((f) => uploadMut.mutate(f))
    e.target.value = ""
  }

  const tabs = [
    { key: "dettaglio" as const, label: "Dettaglio", icon: Eye },
    { key: "file" as const, label: "File", icon: FileBox },
    { key: "job" as const, label: "Job", icon: Cpu },
    { key: "spedizione" as const, label: "Spedizione", icon: Truck },
  ]

  return (
    <div className="h-full flex flex-col gap-4">
      <ConfigCheckBanner />
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold">Ordini</h1>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Lista ordini */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <select
            value={filterStato}
            onChange={(e) => setFilterStato(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(STATO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {ordini.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "var(--muted-text)" }}>
                Nessun ordine trovato
              </p>
            )}
            {ordini.map((o: OrdineListItem) => (
              <button
                key={o.id}
                onClick={() => { setSelectedId(o.id); setActiveTab("dettaglio") }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === o.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-transparent hover:bg-[var(--surface-2)]"
                }`}
                style={{ background: selectedId === o.id ? undefined : "var(--surface-1)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: "var(--muted-text)" }}>{o.numero_ordine}</span>
                  <StatoBadge stato={o.stato} />
                </div>
                <p className="font-medium text-sm truncate">{o.progetto_nome}</p>
                <p className="text-xs truncate" style={{ color: "var(--muted-text)" }}>{o.cliente_nome_snapshot || "—"}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--muted-text)" }}>
                  <span>{o.n_files} file</span>
                  <span>{o.n_jobs_completati}/{o.n_jobs} job</span>
                  <span className="ml-auto font-medium" style={{ color: "var(--text)" }}>€ {fmt(o.prezzo_finale)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dettaglio ordine */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!selectedId || !ordine ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--muted-text)" }}>
              <Package className="w-12 h-12 opacity-30" />
              <p className="text-sm">Seleziona un ordine dalla lista</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{ordine.numero_ordine}</h2>
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>{ordine.progetto_nome} — {ordine.cliente_nome_snapshot || "Nessun cliente"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatoBadge stato={ordine.stato} />
                  {ordine.stato === "nuovo" && (
                    <button onClick={() => transitionMut.mutate("in_lavorazione")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors">
                      Avvia lavorazione
                    </button>
                  )}
                  {ordine.stato === "completato" && (
                    <button onClick={() => transitionMut.mutate("chiuso")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 transition-colors">
                      Chiudi ordine
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-transparent hover:border-[var(--border)]"
                    }`}
                    style={{ color: activeTab === t.key ? undefined : "var(--muted-text)" }}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    {t.key === "file" && <span className="ml-1 text-xs opacity-60">({ordine.files.length})</span>}
                    {t.key === "job" && <span className="ml-1 text-xs opacity-60">({ordine.jobs.length})</span>}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "dettaglio" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Prezzo finale</p>
                    <p className="text-xl font-bold tabular-nums">€ {fmt(ordine.prezzo_finale)}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Utile lordo</p>
                    <p className="text-xl font-bold tabular-nums">€ {fmt(ordine.utile_lordo)}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Costo pieno</p>
                    <p className="text-lg font-semibold tabular-nums">€ {fmt(ordine.costo_pieno)}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Margine</p>
                    <p className="text-lg font-semibold tabular-nums">{fmt(ordine.margine_lordo_perc)}%</p>
                  </div>
                  <div className="col-span-2 p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-text)" }}>Quantita</p>
                    <p className="font-medium">{ordine.quantita} pz</p>
                  </div>
                  {ordine.preventivo_id && (
                    <div className="col-span-2 text-xs" style={{ color: "var(--muted-text)" }}>
                      Da preventivo #{ordine.preventivo_id}
                    </div>
                  )}
                  <div className="col-span-2 flex gap-2 pt-2">
                    <button
                      onClick={() => { if (confirm("Eliminare questo ordine?")) deleteOrdMut.mutate() }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Elimina ordine
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "file" && (
                <div className="space-y-3">
                  <input ref={fileInputRef} type="file" accept=".3mf,.stl,.gcode" multiple className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
                    style={{ borderColor: "var(--border)", color: "var(--muted-text)" }}
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Carica file 3MF</span>
                    <span className="text-xs">Clicca o trascina i file qui</span>
                  </button>

                  {ordine.files.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: "var(--muted-text)" }}>Nessun file caricato</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs" style={{ color: "var(--muted-text)" }}>
                            <th className="pb-2 font-medium">File</th>
                            <th className="pb-2 font-medium">Stampante</th>
                            <th className="pb-2 font-medium">Tempo stimato</th>
                            <th className="pb-2 font-medium">Quantita</th>
                            <th className="pb-2 font-medium">Job</th>
                            <th className="pb-2 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordine.files.map((f) => (
                            <tr key={f.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <FileBox className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                                  <span className="truncate max-w-[160px]">{f.file_name}</span>
                                </div>
                              </td>
                              <td className="py-2">
                                <select
                                  value={f.stampante_id ?? ""}
                                  onChange={(e) => updateFileMut.mutate({
                                    fileId: f.id,
                                    body: { stampante_id: e.target.value ? Number(e.target.value) : null, materiale_magazzino_id: f.materiale_magazzino_id, tempo_stimato_minuti: f.tempo_stimato_minuti, quantita: f.quantita, note: f.note },
                                  })}
                                  className="w-full px-2 py-1 rounded text-xs"
                                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                >
                                  <option value="">— Seleziona —</option>
                                  {stampanti.map((s) => (
                                    <option key={s.id} value={s.id}>{s.asset_name || `${s.marca} ${s.modello}`}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2">
                                <input
                                  type="number"
                                  value={f.tempo_stimato_minuti}
                                  onChange={(e) => updateFileMut.mutate({
                                    fileId: f.id,
                                    body: { stampante_id: f.stampante_id, materiale_magazzino_id: f.materiale_magazzino_id, tempo_stimato_minuti: Number(e.target.value), quantita: f.quantita, note: f.note },
                                  })}
                                  className="w-20 px-2 py-1 rounded text-xs text-right tabular-nums"
                                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                  min={0}
                                  placeholder="min"
                                />
                              </td>
                              <td className="py-2">
                                <input
                                  type="number"
                                  value={f.quantita}
                                  onChange={(e) => updateFileMut.mutate({
                                    fileId: f.id,
                                    body: { stampante_id: f.stampante_id, materiale_magazzino_id: f.materiale_magazzino_id, tempo_stimato_minuti: f.tempo_stimato_minuti, quantita: Number(e.target.value), note: f.note },
                                  })}
                                  className="w-16 px-2 py-1 rounded text-xs text-right tabular-nums"
                                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                  min={1}
                                />
                              </td>
                              <td className="py-2">
                                {f.jobs_count > 0 ? (
                                  <span className="text-xs" style={{ color: "var(--muted-text)" }}>{f.jobs_count} job</span>
                                ) : f.stampante_id ? (
                                  <button
                                    onClick={() => genJobsMut.mutate(f.id)}
                                    className="text-xs font-medium flex items-center gap-1 text-[var(--accent)] hover:underline"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" /> Genera
                                  </button>
                                ) : (
                                  <span className="text-xs" style={{ color: "var(--muted-text)" }}>—</span>
                                )}
                              </td>
                              <td className="py-2">
                                <button onClick={() => deleteFileMut.mutate(f.id)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "job" && (
                <div className="space-y-2">
                  {ordine.jobs.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: "var(--muted-text)" }}>
                      Nessun job generato. Carica file e genera i job dal tab File.
                    </p>
                  ) : (
                    ordine.jobs.map((j) => (
                      <div key={j.id} className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono" style={{ color: "var(--muted-text)" }}>{j.numero_job}</span>
                            <StatoBadge stato={j.stato as OrdineStato} />
                          </div>
                          <p className="text-sm truncate">{j.file_name || "—"}</p>
                          <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                            {j.stampante_nome || "—"} · {j.tempo_stimato_minuti} min stimati
                            {j.tempo_effettivo_minuti != null && ` · ${j.tempo_effettivo_minuti} min effettivi`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {j.stato === "pianificato" && (
                            <button onClick={() => jobStartMut.mutate(j.id)} title="Avvia" className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(j.stato === "pianificato" || j.stato === "in_corso") && (
                            <button onClick={() => { setCompletingJobId(j.id); setCompleteForm({ tempo_effettivo_minuti: j.tempo_stimato_minuti, grammi_effettivi: j.grammi_stimati, note: j.note }) }} title="Completa" className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {j.stato !== "completato" && j.stato !== "annullato" && (
                            <button onClick={() => jobCancelMut.mutate(j.id)} title="Annulla" className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Complete job dialog */}
                  {completingJobId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                      <div className="w-96 rounded-xl p-6 space-y-4" style={{ background: "var(--surface-1)" }}>
                        <h3 className="font-semibold">Completa job</h3>
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Tempo effettivo (minuti)</label>
                          <input type="number" value={completeForm.tempo_effettivo_minuti} onChange={(e) => setCompleteForm((p) => ({ ...p, tempo_effettivo_minuti: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Grammi effettivi</label>
                          <input type="number" value={completeForm.grammi_effettivi} onChange={(e) => setCompleteForm((p) => ({ ...p, grammi_effettivi: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setCompletingJobId(null)} className="px-3 py-1.5 rounded-lg text-sm">Annulla</button>
                          <button onClick={() => jobCompleteMut.mutate()} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white">Completa</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "spedizione" && (
                <div className="space-y-3">
                  {ordine.spedizioni.length > 0 ? (
                    ordine.spedizioni.map((s) => (
                      <div key={s.id} className="p-4 rounded-lg space-y-2" style={{ background: "var(--surface-1)" }}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{s.corriere || "Corriere non specificato"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            s.stato === "spedito" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                            s.stato === "consegnato" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}>{s.stato === "preparazione" ? "In preparazione" : s.stato === "spedito" ? "Spedito" : s.stato === "consegnato" ? "Consegnato" : s.stato}</span>
                        </div>
                        {s.codice_tracking && <p className="text-xs font-mono" style={{ color: "var(--muted-text)" }}>Tracking: {s.codice_tracking}</p>}
                        <div className="flex gap-2 pt-1">
                          {s.stato === "preparazione" && (
                            <button
                              onClick={() => {
                                const tracking = prompt("Codice tracking (opzionale):")
                                markShippedMut.mutate({ id: s.id, tracking: tracking || "", corriere: s.corriere })
                              }}
                              className="text-xs font-medium text-purple-400 hover:underline flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" /> Segna come spedito
                            </button>
                          )}
                          {s.stato === "spedito" && (
                            <button onClick={() => markDeliveredMut.mutate(s.id)} className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Segna come consegnato
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : null}

                  {!showShipForm ? (
                    <button
                      onClick={() => setShowShipForm(true)}
                      className="w-full p-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-colors hover:border-[var(--accent)]"
                      style={{ borderColor: "var(--border)", color: "var(--muted-text)" }}
                    >
                      <PlusCircle className="w-4 h-4" /> Crea spedizione
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg space-y-3" style={{ background: "var(--surface-1)" }}>
                      <h3 className="font-medium text-sm">Nuova spedizione</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Corriere</label>
                          <input value={shipForm.corriere} onChange={(e) => setShipForm((p) => ({ ...p, corriere: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} placeholder="Es. BRT, GLS, DHL..." />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Peso (kg)</label>
                          <input type="number" value={shipForm.peso_kg} onChange={(e) => setShipForm((p) => ({ ...p, peso_kg: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Costo spedizione (€)</label>
                          <input type="number" value={shipForm.costo_spedizione} onChange={(e) => setShipForm((p) => ({ ...p, costo_spedizione: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Costo packing (€)</label>
                          <input type="number" value={shipForm.costo_packing} onChange={(e) => setShipForm((p) => ({ ...p, costo_packing: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: "var(--muted-text)" }}>Indirizzo</label>
                          <input value={shipForm.indirizzo_destinazione} onChange={(e) => setShipForm((p) => ({ ...p, indirizzo_destinazione: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowShipForm(false)} className="px-3 py-1.5 rounded-lg text-sm">Annulla</button>
                        <button onClick={() => createShipMut.mutate()} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white">Crea</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
