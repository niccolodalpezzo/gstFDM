import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { JobLavorazione, JobStato, Stampante } from "@/types"
import { useToast } from "@/components/ui/toast"
import {
  Cpu, Play, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Clock, Layers, Filter,
} from "lucide-react"

const JOB_STATO_CONFIG: Record<JobStato, { label: string; color: string }> = {
  pianificato: { label: "Pianificato", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_corso: { label: "In Corso", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  completato: { label: "Completato", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  annullato: { label: "Annullato", color: "bg-red-500/20 text-red-400 border-red-500/30" },
}

function StatoBadge({ stato }: { stato: JobStato }) {
  const cfg = JOB_STATO_CONFIG[stato] || JOB_STATO_CONFIG.pianificato
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmt(n: number) { return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function JobLavorazioni() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [filterStato, setFilterStato] = useState<string>("")
  const [filterStampante, setFilterStampante] = useState<string>("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [completingJobId, setCompletingJobId] = useState<number | null>(null)
  const [completeForm, setCompleteForm] = useState({ tempo_effettivo_minuti: 0, grammi_effettivi: 0, note: "" })

  const params: { stato?: string; stampante_id?: number } = {}
  if (filterStato) params.stato = filterStato
  if (filterStampante) params.stampante_id = Number(filterStampante)

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs", filterStato, filterStampante], queryFn: () => api.jobs.list(params) })
  const { data: stampanti = [] } = useQuery<Stampante[]>({ queryKey: ["stampanti"], queryFn: api.stampanti.list })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["jobs"] })

  const startMut = useMutation({
    mutationFn: (id: number) => api.jobs.start(id),
    onSuccess: () => { invalidate(); toast({ title: "Job avviato" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.jobs.cancel(id),
    onSuccess: () => { invalidate(); toast({ title: "Job annullato" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const completeMut = useMutation({
    mutationFn: () => api.jobs.complete(completingJobId!, completeForm),
    onSuccess: () => { setCompletingJobId(null); invalidate(); toast({ title: "Job completato" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const counts = {
    pianificato: jobs.filter((j) => j.stato === "pianificato").length,
    in_corso: jobs.filter((j) => j.stato === "in_corso").length,
    completato: jobs.filter((j) => j.stato === "completato").length,
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <Cpu className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold">Job / Lavorazioni</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Pianificati</p>
            <p className="text-lg font-bold tabular-nums">{counts.pianificato}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Layers className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>In Corso</p>
            <p className="text-lg font-bold tabular-nums">{counts.in_corso}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Completati</p>
            <p className="text-lg font-bold tabular-nums">{counts.completato}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4" style={{ color: "var(--muted-text)" }} />
        <select
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(JOB_STATO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterStampante}
          onChange={(e) => setFilterStampante(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="">Tutte le stampanti</option>
          {stampanti.map((s) => (
            <option key={s.id} value={s.id}>{s.asset_name || `${s.marca} ${s.modello}`}</option>
          ))}
        </select>
      </div>

      {/* Job table */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--muted-text)" }}>
            <Cpu className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nessun job trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--muted-text)" }}>
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Ordine</th>
                  <th className="pb-2 font-medium">File</th>
                  <th className="pb-2 font-medium">Stampante</th>
                  <th className="pb-2 font-medium text-right">Qtà</th>
                  <th className="pb-2 font-medium text-right">Tempo stimato</th>
                  <th className="pb-2 font-medium">Stato</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j: JobLavorazione) => (
                  <>
                    <tr
                      key={j.id}
                      className="border-t cursor-pointer hover:bg-[var(--surface-1)]/50"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                    >
                      <td className="py-2.5">
                        <span className="font-mono text-xs">{j.numero_job}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-xs" style={{ color: "var(--muted-text)" }}>{j.ordine_numero || `#${j.ordine_id}`}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="truncate max-w-[160px] inline-block">{j.file_name || "—"}</span>
                      </td>
                      <td className="py-2.5">{j.stampante_nome || "—"}</td>
                      <td className="py-2.5 text-right tabular-nums">{j.quantita}</td>
                      <td className="py-2.5 text-right tabular-nums">{j.tempo_stimato_minuti} min</td>
                      <td className="py-2.5"><StatoBadge stato={j.stato} /></td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {j.stato === "pianificato" && (
                            <button onClick={() => startMut.mutate(j.id)} title="Avvia" className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(j.stato === "pianificato" || j.stato === "in_corso") && (
                            <button
                              onClick={() => {
                                setCompletingJobId(j.id)
                                setCompleteForm({ tempo_effettivo_minuti: j.tempo_stimato_minuti, grammi_effettivi: j.grammi_stimati, note: j.note })
                              }}
                              title="Completa"
                              className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {j.stato !== "completato" && j.stato !== "annullato" && (
                            <button onClick={() => cancelMut.mutate(j.id)} title="Annulla" className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {expandedId === j.id ? <ChevronUp className="w-4 h-4 ml-1" style={{ color: "var(--muted-text)" }} /> : <ChevronDown className="w-4 h-4 ml-1" style={{ color: "var(--muted-text)" }} />}
                        </div>
                      </td>
                    </tr>
                    {expandedId === j.id && (
                      <tr key={`${j.id}-detail`} style={{ background: "var(--surface-1)" }}>
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                              <p style={{ color: "var(--muted-text)" }}>Materiale</p>
                              <p className="font-medium">{j.materiale_nome || "—"}</p>
                            </div>
                            <div>
                              <p style={{ color: "var(--muted-text)" }}>Grammi stimati</p>
                              <p className="font-medium tabular-nums">{fmt(j.grammi_stimati)} g</p>
                            </div>
                            <div>
                              <p style={{ color: "var(--muted-text)" }}>Tempo effettivo</p>
                              <p className="font-medium tabular-nums">{j.tempo_effettivo_minuti != null ? `${j.tempo_effettivo_minuti} min` : "—"}</p>
                            </div>
                            <div>
                              <p style={{ color: "var(--muted-text)" }}>Grammi effettivi</p>
                              <p className="font-medium tabular-nums">{j.grammi_effettivi != null ? `${fmt(j.grammi_effettivi)} g` : "—"}</p>
                            </div>
                            {j.data_inizio && (
                              <div>
                                <p style={{ color: "var(--muted-text)" }}>Inizio</p>
                                <p className="font-medium">{new Date(j.data_inizio).toLocaleString("it-IT")}</p>
                              </div>
                            )}
                            {j.data_fine && (
                              <div>
                                <p style={{ color: "var(--muted-text)" }}>Fine</p>
                                <p className="font-medium">{new Date(j.data_fine).toLocaleString("it-IT")}</p>
                              </div>
                            )}
                            {j.note && (
                              <div className="col-span-4">
                                <p style={{ color: "var(--muted-text)" }}>Note</p>
                                <p>{j.note}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete job dialog */}
      {completingJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl p-6 space-y-4" style={{ background: "var(--surface-1)" }}>
            <h3 className="font-semibold">Completa job</h3>
            <div>
              <label className="text-xs" style={{ color: "var(--muted-text)" }}>Tempo effettivo (minuti)</label>
              <input
                type="number"
                value={completeForm.tempo_effettivo_minuti}
                onChange={(e) => setCompleteForm((p) => ({ ...p, tempo_effettivo_minuti: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--muted-text)" }}>Grammi effettivi</label>
              <input
                type="number"
                value={completeForm.grammi_effettivi}
                onChange={(e) => setCompleteForm((p) => ({ ...p, grammi_effettivi: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--muted-text)" }}>Note</label>
              <input
                value={completeForm.note}
                onChange={(e) => setCompleteForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCompletingJobId(null)} className="px-3 py-1.5 rounded-lg text-sm">Annulla</button>
              <button onClick={() => completeMut.mutate()} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white">Completa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
