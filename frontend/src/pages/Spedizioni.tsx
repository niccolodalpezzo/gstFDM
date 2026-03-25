import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Spedizione, SpedizioneStato } from "@/types"
import { useToast } from "@/components/ui/toast"
import {
  Truck, CheckCircle2, Package, Trash2, Edit3, Save, X,
} from "lucide-react"

const SPEDIZIONE_STATO_CONFIG: Record<SpedizioneStato, { label: string; color: string }> = {
  preparazione: { label: "In Preparazione", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  spedito: { label: "Spedito", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  consegnato: { label: "Consegnato", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  reso: { label: "Reso", color: "bg-red-500/20 text-red-400 border-red-500/30" },
}

function StatoBadge({ stato }: { stato: SpedizioneStato }) {
  const cfg = SPEDIZIONE_STATO_CONFIG[stato] || SPEDIZIONE_STATO_CONFIG.preparazione
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmt(n: number) { return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function Spedizioni() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Spedizione>>({})

  const { data: spedizioni = [] } = useQuery({ queryKey: ["spedizioni"], queryFn: () => api.spedizioni.list() })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["spedizioni"] })

  const updateMut = useMutation({
    mutationFn: () => api.spedizioni.update(editingId!, {
      corriere: editForm.corriere || "",
      costo_spedizione: editForm.costo_spedizione || 0,
      costo_packing: editForm.costo_packing || 0,
      peso_kg: editForm.peso_kg || 0,
      indirizzo_destinazione: editForm.indirizzo_destinazione || "",
      note: editForm.note || "",
      codice_tracking: editForm.codice_tracking || "",
    }),
    onSuccess: () => { setEditingId(null); invalidate(); toast({ title: "Spedizione aggiornata" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const shipMut = useMutation({
    mutationFn: ({ id, tracking, corriere }: { id: number; tracking: string; corriere: string }) =>
      api.spedizioni.ship(id, { codice_tracking: tracking, corriere }),
    onSuccess: () => { invalidate(); toast({ title: "Spedizione segnata come spedita" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const deliverMut = useMutation({
    mutationFn: (id: number) => api.spedizioni.deliver(id),
    onSuccess: () => { invalidate(); toast({ title: "Spedizione segnata come consegnata" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.spedizioni.delete(id),
    onSuccess: () => { invalidate(); toast({ title: "Spedizione eliminata" }) },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  })

  const startEdit = (s: Spedizione) => {
    setEditingId(s.id)
    setEditForm({
      corriere: s.corriere,
      codice_tracking: s.codice_tracking,
      costo_spedizione: s.costo_spedizione,
      costo_packing: s.costo_packing,
      peso_kg: s.peso_kg,
      indirizzo_destinazione: s.indirizzo_destinazione,
      note: s.note,
    })
  }

  const counts = {
    preparazione: spedizioni.filter((s) => s.stato === "preparazione").length,
    spedito: spedizioni.filter((s) => s.stato === "spedito").length,
    consegnato: spedizioni.filter((s) => s.stato === "consegnato").length,
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <Truck className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold">Spedizioni</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Package className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>In Preparazione</p>
            <p className="text-lg font-bold tabular-nums">{counts.preparazione}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Truck className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Spedite</p>
            <p className="text-lg font-bold tabular-nums">{counts.spedito}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Consegnate</p>
            <p className="text-lg font-bold tabular-nums">{counts.consegnato}</p>
          </div>
        </div>
      </div>

      {/* Spedizioni list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {spedizioni.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--muted-text)" }}>
            <Truck className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nessuna spedizione</p>
            <p className="text-xs">Le spedizioni vengono create dalla pagina Ordini</p>
          </div>
        ) : (
          spedizioni.map((s: Spedizione) => (
            <div key={s.id} className="p-4 rounded-lg" style={{ background: "var(--surface-1)" }}>
              {editingId === s.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--muted-text)" }}>
                      Ordine: {s.ordine_numero || `#${s.ordine_id}`}
                    </span>
                    <StatoBadge stato={s.stato} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: "var(--muted-text)" }}>Corriere</label>
                      <input
                        value={editForm.corriere || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, corriere: e.target.value }))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "var(--muted-text)" }}>Tracking</label>
                      <input
                        value={editForm.codice_tracking || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, codice_tracking: e.target.value }))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "var(--muted-text)" }}>Costo spedizione (€)</label>
                      <input
                        type="number"
                        value={editForm.costo_spedizione || 0}
                        onChange={(e) => setEditForm((p) => ({ ...p, costo_spedizione: Number(e.target.value) }))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: "var(--muted-text)" }}>Peso (kg)</label>
                      <input
                        type="number"
                        value={editForm.peso_kg || 0}
                        onChange={(e) => setEditForm((p) => ({ ...p, peso_kg: Number(e.target.value) }))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs" style={{ color: "var(--muted-text)" }}>Indirizzo</label>
                      <input
                        value={editForm.indirizzo_destinazione || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, indirizzo_destinazione: e.target.value }))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Annulla
                    </button>
                    <button onClick={() => updateMut.mutate()} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" /> Salva
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.corriere || "Corriere non specificato"}</span>
                      <span className="text-xs" style={{ color: "var(--muted-text)" }}>
                        — {s.ordine_numero || `Ordine #${s.ordine_id}`}
                      </span>
                      {s.cliente_nome && (
                        <span className="text-xs" style={{ color: "var(--muted-text)" }}>· {s.cliente_nome}</span>
                      )}
                    </div>
                    <StatoBadge stato={s.stato} />
                  </div>

                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-text)" }}>
                    {s.codice_tracking && <span className="font-mono">Tracking: {s.codice_tracking}</span>}
                    {s.peso_kg > 0 && <span>{fmt(s.peso_kg)} kg</span>}
                    {s.costo_spedizione > 0 && <span>€ {fmt(s.costo_spedizione)}</span>}
                    {s.indirizzo_destinazione && <span className="truncate max-w-[200px]">{s.indirizzo_destinazione}</span>}
                  </div>

                  {s.data_spedizione && (
                    <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                      Spedita il {new Date(s.data_spedizione).toLocaleDateString("it-IT")}
                      {s.data_consegna && ` · Consegnata il ${new Date(s.data_consegna).toLocaleDateString("it-IT")}`}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {s.stato === "preparazione" && (
                      <button
                        onClick={() => {
                          const tracking = prompt("Codice tracking (opzionale):")
                          shipMut.mutate({ id: s.id, tracking: tracking || "", corriere: s.corriere })
                        }}
                        className="text-xs font-medium text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" /> Segna come spedito
                      </button>
                    )}
                    {s.stato === "spedito" && (
                      <button onClick={() => deliverMut.mutate(s.id)} className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Segna come consegnato
                      </button>
                    )}
                    {s.stato === "preparazione" && (
                      <button onClick={() => startEdit(s)} className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5" /> Modifica
                      </button>
                    )}
                    {s.stato === "preparazione" && (
                      <button
                        onClick={() => { if (confirm("Eliminare questa spedizione?")) deleteMut.mutate(s.id) }}
                        className="text-xs font-medium text-red-400 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Elimina
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
