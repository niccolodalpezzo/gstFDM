import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { OrdineListItem, OrdineStato, Ordine } from "@/types"
import {
  History, ChevronDown, ChevronUp, TrendingUp, Receipt, BarChart3,
  Truck, CheckCircle2, Archive,
} from "lucide-react"

const STATO_CONFIG: Record<string, { label: string; color: string }> = {
  completato: { label: "Completato", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  spedito: { label: "Spedito", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  chiuso: { label: "Chiuso", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
}

function StatoBadge({ stato }: { stato: string }) {
  const cfg = STATO_CONFIG[stato] || { label: stato, color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function fmt(n: number) { return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function StoricoOrdini() {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filterStato, setFilterStato] = useState<string>("")

  // Fetch completed/shipped/closed orders
  const { data: completati = [] } = useQuery({ queryKey: ["ordini", "completato"], queryFn: () => api.ordini.list({ stato: "completato" }) })
  const { data: spediti = [] } = useQuery({ queryKey: ["ordini", "spedito"], queryFn: () => api.ordini.list({ stato: "spedito" }) })
  const { data: chiusi = [] } = useQuery({ queryKey: ["ordini", "chiuso"], queryFn: () => api.ordini.list({ stato: "chiuso" }) })

  const allOrders = [...completati, ...spediti, ...chiusi]
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))

  const filteredOrders = filterStato
    ? allOrders.filter((o) => o.stato === filterStato)
    : allOrders

  // Summary
  const totFatturato = allOrders.reduce((s, o) => s + o.prezzo_finale, 0)

  // Load detail for expanded
  const { data: expandedOrdine } = useQuery<Ordine>({
    queryKey: ["ordine", expandedId],
    queryFn: () => api.ordini.get(expandedId!),
    enabled: !!expandedId,
  })

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <History className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold">Storico Ordini</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Receipt className="w-5 h-5 text-[var(--accent)]" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Fatturato totale</p>
            <p className="text-lg font-bold tabular-nums">€ {fmt(totFatturato)}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Completati</p>
            <p className="text-lg font-bold tabular-nums">{completati.length}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Truck className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Spediti</p>
            <p className="text-lg font-bold tabular-nums">{spediti.length}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--surface-1)" }}>
          <Archive className="w-5 h-5 text-zinc-400" />
          <div>
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Chiusi</p>
            <p className="text-lg font-bold tabular-nums">{chiusi.length}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="">Tutti ({allOrders.length})</option>
          <option value="completato">Completati ({completati.length})</option>
          <option value="spedito">Spediti ({spediti.length})</option>
          <option value="chiuso">Chiusi ({chiusi.length})</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--muted-text)" }}>
            <History className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nessun ordine completato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--muted-text)" }}>
                  <th className="pb-2 font-medium">Ordine</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Progetto</th>
                  <th className="pb-2 font-medium text-right">Prezzo</th>
                  <th className="pb-2 font-medium">Stato</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o: OrdineListItem) => (
                  <>
                    <tr
                      key={o.id}
                      className="border-t cursor-pointer hover:bg-[var(--surface-1)]/50"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    >
                      <td className="py-2.5">
                        <span className="font-mono text-xs">{o.numero_ordine}</span>
                      </td>
                      <td className="py-2.5">{o.cliente_nome_snapshot || "—"}</td>
                      <td className="py-2.5 truncate max-w-[200px]">{o.progetto_nome}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium">€ {fmt(o.prezzo_finale)}</td>
                      <td className="py-2.5"><StatoBadge stato={o.stato} /></td>
                      <td className="py-2.5 text-xs" style={{ color: "var(--muted-text)" }}>
                        {o.data_creazione ? new Date(o.data_creazione).toLocaleDateString("it-IT") : "—"}
                      </td>
                      <td className="py-2.5">
                        {expandedId === o.id
                          ? <ChevronUp className="w-4 h-4" style={{ color: "var(--muted-text)" }} />
                          : <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-text)" }} />
                        }
                      </td>
                    </tr>
                    {expandedId === o.id && expandedOrdine && (
                      <tr key={`${o.id}-detail`} style={{ background: "var(--surface-1)" }}>
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-4">
                            {/* Financial summary */}
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs" style={{ color: "var(--muted-text)" }}>Prezzo finale</p>
                                <p className="font-bold tabular-nums">€ {fmt(expandedOrdine.prezzo_finale)}</p>
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: "var(--muted-text)" }}>Costo pieno</p>
                                <p className="font-medium tabular-nums">€ {fmt(expandedOrdine.costo_pieno)}</p>
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: "var(--muted-text)" }}>Utile lordo</p>
                                <p className="font-medium tabular-nums text-emerald-400">€ {fmt(expandedOrdine.utile_lordo)}</p>
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: "var(--muted-text)" }}>Margine</p>
                                <p className="font-medium tabular-nums">{fmt(expandedOrdine.margine_lordo_perc)}%</p>
                              </div>
                            </div>

                            {/* Jobs */}
                            {expandedOrdine.jobs.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-text)" }}>
                                  Job ({expandedOrdine.jobs.length})
                                </p>
                                <div className="space-y-1">
                                  {expandedOrdine.jobs.map((j) => (
                                    <div key={j.id} className="flex items-center gap-3 text-xs p-2 rounded" style={{ background: "var(--surface-2)" }}>
                                      <span className="font-mono" style={{ color: "var(--muted-text)" }}>{j.numero_job}</span>
                                      <span>{j.stampante_nome || "—"}</span>
                                      <span className="tabular-nums">{j.tempo_stimato_minuti} min stim.</span>
                                      {j.tempo_effettivo_minuti != null && (
                                        <span className="tabular-nums text-emerald-400">{j.tempo_effettivo_minuti} min eff.</span>
                                      )}
                                      <span className={`ml-auto px-1.5 py-0.5 rounded-full border text-[10px] ${
                                        j.stato === "completato" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                        j.stato === "annullato" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                        "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                      }`}>{j.stato}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Spedizioni */}
                            {expandedOrdine.spedizioni.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-text)" }}>
                                  Spedizioni ({expandedOrdine.spedizioni.length})
                                </p>
                                <div className="space-y-1">
                                  {expandedOrdine.spedizioni.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 text-xs p-2 rounded" style={{ background: "var(--surface-2)" }}>
                                      <Truck className="w-3.5 h-3.5" style={{ color: "var(--muted-text)" }} />
                                      <span>{s.corriere || "—"}</span>
                                      {s.codice_tracking && <span className="font-mono">{s.codice_tracking}</span>}
                                      {s.data_spedizione && (
                                        <span style={{ color: "var(--muted-text)" }}>
                                          {new Date(s.data_spedizione).toLocaleDateString("it-IT")}
                                        </span>
                                      )}
                                      <span className={`ml-auto px-1.5 py-0.5 rounded-full border text-[10px] ${
                                        s.stato === "consegnato" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                        s.stato === "spedito" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                                        "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                      }`}>{s.stato}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {expandedOrdine.note && (
                              <div>
                                <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-text)" }}>Note</p>
                                <p className="text-sm">{expandedOrdine.note}</p>
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
    </div>
  )
}
