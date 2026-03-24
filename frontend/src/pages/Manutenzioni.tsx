import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink,
  Plus, Settings, Trash2, Wrench,
} from "lucide-react"

import { PageLayout, EmptyState } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import type { ExtraordinaryComponent, PrinterMaintenanceItem, PrinterMaintenanceStatus } from "@/types"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATO_META: Record<string, { color: string; bg: string; label: string }> = {
  ok:      { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  label: "OK" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "In scadenza" },
  due:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  label: "Scaduta" },
}

// ─── Mark-done dialog (tempo per tutti i check selezionati) ──────────────────

function MarkDoneDialog({
  printer,
  checkedItems,
  open,
  onClose,
}: {
  printer: PrinterMaintenanceStatus
  checkedItems: PrinterMaintenanceItem[]
  open: boolean
  onClose: () => void
}) {
  const showToast = useToast()
  const qc = useQueryClient()
  const [note, setNote] = useState("")
  const [minuti, setMinuti] = useState<string>("")
  const minutiNum = parseFloat(minuti)
  const minutiValidi = minuti !== "" && minutiNum > 0 && !isNaN(minutiNum)

  const mutation = useMutation({
    mutationFn: () =>
      Promise.all(
        checkedItems.map(item =>
          api.manutenzioni.markDone(
            printer.printer_id,
            item.template_id,
            printer.accumulated_runtime_hours,
            minutiNum,
            note,
          )
        )
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manutenzioni"] })
      showToast(`${checkedItems.length} manutenzione/i registrata/e`, "success")
      onClose()
      setNote("")
      setMinuti("")
    },
    onError: (e: Error) => showToast(e.message, "error"),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text)" }}>Manutenzione fatta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Riepilogo lavori selezionati */}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--muted-bg)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>
              {printer.printer_nome} — {printer.accumulated_runtime_hours.toFixed(1)}h accumulate
            </p>
            <ul className="space-y-0.5">
              {checkedItems.map(item => (
                <li key={item.template_id} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text)" }}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#22c55e" }} />
                  {item.template_nome}
                </li>
              ))}
            </ul>
          </div>

          {/* Tempo impiegato — OBBLIGATORIO */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
              Tempo impiegato (minuti) <span style={{ color: "var(--error, #ef4444)" }}>*</span>
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="es. 20"
              value={minuti}
              onChange={e => setMinuti(e.target.value)}
              style={minuti !== "" && !minutiValidi ? { borderColor: "var(--error, #ef4444)" } : {}}
            />
            {minuti !== "" && !minutiValidi && (
              <p className="text-xs" style={{ color: "var(--error, #ef4444)" }}>Inserisci un valore &gt; 0</p>
            )}
            {minutiValidi && (
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                Genera un costo di manodopera che verrà spalmato sul costo orario farm.
              </p>
            )}
          </div>

          {/* Note opzionali */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>Note (opzionale)</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none transition-colors"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text)" }}
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="es. Sostituito lubrificante XYZ..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !minutiValidi}
            >
              {mutation.isPending ? "Salvataggio..." : "Conferma"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Extraordinary maintenance dialog ─────────────────────────────────────────

function ExtraordinaryDialog({ printerId, printerName, open, onClose }: {
  printerId: number; printerName: string; open: boolean; onClose: () => void
}) {
  const showToast = useToast()
  const qc = useQueryClient()
  const [descProblema, setDescProblema] = useState("")
  const [giorniFermo, setGiorniFermo] = useState(0)
  const [note, setNote] = useState("")
  const [componenti, setComponenti] = useState<ExtraordinaryComponent[]>([{ descrizione: "", link: "", costo: 0 }])
  const [oreDaSpalmare, setOreDaSpalmare] = useState<string>("")

  const costoTotale = componenti.reduce((s, c) => s + (c.costo || 0), 0)
  const oreNum = parseFloat(oreDaSpalmare)
  const quotaOraria = oreDaSpalmare !== "" && oreNum > 0 && costoTotale > 0 ? costoTotale / oreNum : null
  const oreValide = oreDaSpalmare === "" || (oreNum > 0 && !isNaN(oreNum))

  const mutation = useMutation({
    mutationFn: () => api.manutenzioni.createStraordinaria({
      printer_id: printerId,
      descrizione_problema: descProblema,
      giorni_fermo: giorniFermo,
      componenti,
      note,
      ore_print_farm_da_spalmare: oreDaSpalmare !== "" && oreNum > 0 ? oreNum : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manutenzioni-straordinaria"] })
      showToast("Manutenzione straordinaria registrata", "success")
      onClose()
      setDescProblema(""); setGiorniFermo(0); setNote(""); setOreDaSpalmare("")
      setComponenti([{ descrizione: "", link: "", costo: 0 }])
    },
    onError: (e: Error) => showToast(e.message, "error"),
  })

  const addComponente = () => setComponenti(prev => [...prev, { descrizione: "", link: "", costo: 0 }])
  const removeComponente = (i: number) => setComponenti(prev => prev.filter((_, idx) => idx !== i))
  const updateComponente = (i: number, field: keyof ExtraordinaryComponent, value: string | number) =>
    setComponenti(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text)" }}>Manutenzione straordinaria — {printerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Descrizione problema *</Label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text)" }}
              rows={3}
              value={descProblema}
              onChange={e => setDescProblema(e.target.value)}
              placeholder="Descrivi il problema riscontrato..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Giorni di fermo</Label>
            <Input type="number" min={0} value={giorniFermo} onChange={e => setGiorniFermo(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Componenti / ricambi</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addComponente}>
                <Plus className="h-3.5 w-3.5 mr-1" />Aggiungi
              </Button>
            </div>
            {componenti.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 items-end">
                <div className="space-y-1"><Label className="text-xs">Descrizione</Label><Input placeholder="es. Cinghia X" value={c.descrizione} onChange={e => updateComponente(i, "descrizione", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Link (opzionale)</Label><Input placeholder="https://..." value={c.link} onChange={e => updateComponente(i, "link", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Costo (€)</Label><Input type="number" step="0.01" min={0} value={c.costo} onChange={e => updateComponente(i, "costo", Number(e.target.value))} /></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeComponente(i)} disabled={componenti.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <p className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>
              Totale: <span style={{ color: "var(--text)" }}>€{costoTotale.toFixed(2)}</span>
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--muted-bg)" }}>
            <Label>Ore farm su cui spalmare il costo (opzionale)</Label>
            <Input
              type="number" min={1} step={1} placeholder="es. 500"
              value={oreDaSpalmare}
              onChange={e => setOreDaSpalmare(e.target.value)}
              style={!oreValide ? { borderColor: "var(--error, #ef4444)" } : {}}
            />
            {quotaOraria !== null && (
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                Quota oraria ricambi: <span style={{ color: "var(--accent)" }}>€{quotaOraria.toFixed(4)}/h</span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Note aggiuntive</Label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text)" }}
              rows={2} value={note} onChange={e => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Annulla</Button>
            <Button onClick={() => mutation.mutate()} disabled={!descProblema.trim() || !oreValide || mutation.isPending}>
              {mutation.isPending ? "Registrazione..." : "Registra manutenzione"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Printer checklist card ───────────────────────────────────────────────────

function PrinterChecklistCard({ printer }: { printer: PrinterMaintenanceStatus }) {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [markOpen, setMarkOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)

  const worstMeta = STATO_META[printer.worst_stato] ?? STATO_META.ok
  const itemsSorted = [...printer.items].sort((a, b) => b.elapsed_hours - a.elapsed_hours)
  const checkedItems = itemsSorted.filter(item => checked.has(item.template_id))

  const toggleCheck = (id: number) =>
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <>
      <Card style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm" style={{ color: "var(--text)" }}>
                {printer.printer_nome}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                {printer.accumulated_runtime_hours.toFixed(1)}h accumulate
              </p>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
              style={{ background: worstMeta.bg, color: worstMeta.color }}
            >
              {worstMeta.label}
            </span>
          </div>

          {/* Checklist */}
          {itemsSorted.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>Nessun template attivo.</p>
          ) : (
            <div className="space-y-0 divide-y" style={{ borderColor: "var(--card-border)" }}>
              {itemsSorted.map(item => {
                const meta = STATO_META[item.stato] ?? STATO_META.ok
                const isChecked = checked.has(item.template_id)
                return (
                  <label
                    key={item.template_id}
                    className="flex items-center gap-3 py-2.5 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(item.template_id)}
                      className="h-4 w-4 rounded shrink-0"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate" style={{ color: isChecked ? "var(--muted-text)" : "var(--text)", textDecoration: isChecked ? "line-through" : "none" }}>
                        {item.template_nome}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: meta.color }}>
                        {item.elapsed_hours.toFixed(1)}h dall'ultima esecuzione
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Pulsante manutenzione fatta */}
          {itemsSorted.length > 0 && (
            <Button
              size="sm"
              className="w-full gap-2"
              disabled={checked.size === 0}
              onClick={() => setMarkOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Manutenzione fatta{checked.size > 0 ? ` (${checked.size})` : ""}
            </Button>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--card-border)" }}>
            <button
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
              onClick={() => navigate(`/produzione/pianificazione?categoria=manutenzione&printer_id=${printer.printer_id}`)}
            >
              <Clock className="h-3.5 w-3.5" />
              Pianifica
            </button>
            <button
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--muted-text)" }}
              onClick={() => setExtraOpen(true)}
            >
              <Wrench className="h-3.5 w-3.5" />
              Straordinaria
            </button>
          </div>
        </CardContent>
      </Card>

      <MarkDoneDialog
        printer={printer}
        checkedItems={checkedItems}
        open={markOpen}
        onClose={() => {
          setMarkOpen(false)
          setChecked(new Set())
        }}
      />
      <ExtraordinaryDialog
        printerId={printer.printer_id}
        printerName={printer.printer_nome}
        open={extraOpen}
        onClose={() => setExtraOpen(false)}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Manutenzioni() {
  const navigate = useNavigate()

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ["manutenzioni"],
    queryFn: api.manutenzioni.listPrinters,
  })

  const withAlerts = printers.filter(p => p.worst_stato !== "ok")
  const withoutAlerts = printers.filter(p => p.worst_stato === "ok")

  return (
    <PageLayout
      title="Manutenzioni ordinarie"
      description="Checklist manutenzioni per stampante, basata sulle ore accumulate dall'ultima esecuzione."
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/impostazioni#manutenzioni-ordinarie")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Configura template
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-sm" style={{ color: "var(--muted-text)" }}>Caricamento...</div>
      ) : printers.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title="Nessuna stampante trovata"
          description="Aggiungi stampanti nella sezione Elenco stampanti per monitorare le manutenzioni."
          action={
            <Button variant="ghost" onClick={() => navigate("/stampanti/elenco")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Vai a Elenco stampanti
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {withAlerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--error, #ef4444)" }}>
                <AlertTriangle className="h-4 w-4" />
                Richiedono attenzione ({withAlerts.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {withAlerts.map(p => <PrinterChecklistCard key={p.printer_id} printer={p} />)}
              </div>
            </section>
          )}
          {withoutAlerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--muted-text)" }}>
                Nessun intervento necessario ({withoutAlerts.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {withoutAlerts.map(p => <PrinterChecklistCard key={p.printer_id} printer={p} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </PageLayout>
  )
}
