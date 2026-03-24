import { useState, useMemo, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  ChevronLeft, ChevronRight, Plus, X, Download, Paperclip, Calendar, Printer,
} from "lucide-react"
import { api } from "@/lib/api"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import type { PianificazioneEvento, Cliente, Progetto, Stampante, EventoStato, EventoCategoria } from "@/types"
import { EVENTO_STATI, EVENTO_CATEGORIE } from "@/types"

// ─── Colori stato ─────────────────────────────────────────────────────────────
const STATO_COLORS: Record<EventoStato, string> = {
  "Pianificato": "var(--info)",
  "In corso":    "var(--warning)",
  "Completato":  "var(--success)",
  "Annullato":   "var(--muted-text)",
}
const STATO_BG: Record<EventoStato, string> = {
  "Pianificato": "var(--info-bg)",
  "In corso":    "var(--warning-bg)",
  "Completato":  "var(--success-bg)",
  "Annullato":   "var(--muted-bg)",
}

// ─── Colori categoria (chip nel calendario) ───────────────────────────────────
const CATEGORIA_COLORS: Record<EventoCategoria, { color: string; label: string }> = {
  stampe:        { color: "#6366f1", label: "Stampe" },
  manutenzione:  { color: "#f59e0b", label: "Manutenzione" },
  appuntamenti:  { color: "#22c55e", label: "Appuntamenti" },
}

// ─── Helpers data ─────────────────────────────────────────────────────────────
const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
const MESI_IT = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
]

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function toLocalDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  if (dateStr.includes("T")) return dateStr.slice(0, 16)
  return dateStr.slice(0, 10) + "T00:00"
}

function formatDisplay(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("it-IT", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
}

// ─── Tipi form ────────────────────────────────────────────────────────────────
interface EventForm {
  titolo: string
  start_at: string
  end_at: string
  cliente_id: string
  progetto_id: string
  printer_id: string
  durata_prevista_minuti: string
  note: string
  stato: EventoStato
  categoria: EventoCategoria
}

const defaultForm = (startDate?: string, initCategoria?: EventoCategoria, initPrinterId?: string): EventForm => ({
  titolo: "",
  start_at: startDate ? `${startDate}T08:00` : "",
  end_at: "",
  cliente_id: "__none__",
  progetto_id: "__none__",
  printer_id: initPrinterId ?? "__none__",
  durata_prevista_minuti: "",
  note: "",
  stato: "Pianificato",
  categoria: initCategoria ?? "stampe",
})

// ─── Componente principale ────────────────────────────────────────────────────
export default function Pianificazione() {
  const now = new Date()
  const [searchParams] = useSearchParams()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-based
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<PianificazioneEvento | null>(null)
  const [form, setForm]             = useState<EventForm>(defaultForm())
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [filterCategoria, setFilterCategoria] = useState<EventoCategoria | "">("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const showToast = useToast()

  // URL params precompilation: ?categoria=manutenzione&printer_id=3
  useEffect(() => {
    const cat = searchParams.get("categoria") as EventoCategoria | null
    const pid = searchParams.get("printer_id")
    if (cat && EVENTO_CATEGORIE.includes(cat)) {
      setFilterCategoria(cat)
      // Auto-open create dialog with precompiled values
      setEditing(null)
      setFileToUpload(null)
      setForm(defaultForm(undefined, cat, pid ?? undefined))
      setDialogOpen(true)
    }
  // Run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Query ──────────────────────────────────────────────────────────────────
  const { data: eventi = [] } = useQuery({
    queryKey: ["pianificazione", viewYear, viewMonth + 1],
    queryFn: () => api.pianificazione.list(viewYear, viewMonth + 1),
  })
  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["clienti"],
    queryFn: api.clienti.list,
  })
  const { data: allProgetti = [] } = useQuery<Progetto[]>({
    queryKey: ["progetti"],
    queryFn: api.progetti.list,
  })
  const { data: stampanti = [] } = useQuery<Stampante[]>({
    queryKey: ["stampanti"],
    queryFn: api.stampanti.list,
  })

  // Filtra progetti per cliente selezionato
  const progettiFiltrati = useMemo(() => {
    if (!form.cliente_id) return allProgetti
    const cid = parseInt(form.cliente_id)
    return allProgetti.filter(p => p.cliente_id === cid)
  }, [form.cliente_id, allProgetti])

  // Filtra eventi per categoria
  const eventiFiltrati = useMemo(() => {
    if (!filterCategoria) return eventi
    return eventi.filter(e => e.categoria === filterCategoria)
  }, [eventi, filterCategoria])

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append("titolo",    form.titolo)
      fd.append("start_at",  form.start_at)
      fd.append("categoria", form.categoria)
      if (form.end_at)                                              fd.append("end_at", form.end_at)
      if (form.cliente_id  && form.cliente_id  !== "__none__")      fd.append("cliente_id", form.cliente_id)
      if (form.progetto_id && form.progetto_id !== "__none__")      fd.append("progetto_id", form.progetto_id)
      if (form.printer_id  && form.printer_id  !== "__none__")      fd.append("printer_id", form.printer_id)
      if (form.durata_prevista_minuti)      fd.append("durata_prevista_minuti", form.durata_prevista_minuti)
      fd.append("note",  form.note)
      fd.append("stato", form.stato)
      if (fileToUpload) fd.append("file", fileToUpload)

      if (editing) return api.pianificazione.update(editing.id, fd)
      return api.pianificazione.create(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pianificazione"] })
      closeDialog()
      showToast(editing ? "Evento aggiornato" : "Evento creato", "success")
    },
    onError: (e: Error) => {
      showToast(`Errore: ${e.message}`, "error")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.pianificazione.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pianificazione"] })
      closeDialog()
      showToast("Evento eliminato", "success")
    },
  })

  // ─── Calendario: costruzione griglia ────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(viewYear, viewMonth, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [viewYear, viewMonth])

  // Mappa data → eventi (filtrati per categoria)
  const eventiPerGiorno = useMemo(() => {
    const map: Record<string, PianificazioneEvento[]> = {}
    for (const ev of eventiFiltrati) {
      const key = ev.start_at.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [eventiFiltrati])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function openCreate(day?: Date) {
    setEditing(null)
    setFileToUpload(null)
    setForm(defaultForm(
      day ? toDateKey(day) : undefined,
      filterCategoria || undefined,
    ))
    setDialogOpen(true)
  }

  function openEdit(ev: PianificazioneEvento) {
    setEditing(ev)
    setFileToUpload(null)
    setForm({
      titolo:                  ev.titolo,
      start_at:                toLocalDateTime(ev.start_at),
      end_at:                  toLocalDateTime(ev.end_at),
      cliente_id:              ev.cliente_id ? String(ev.cliente_id) : "__none__",
      progetto_id:             ev.progetto_id ? String(ev.progetto_id) : "__none__",
      printer_id:              ev.printer_id ? String(ev.printer_id) : "__none__",
      durata_prevista_minuti:  ev.durata_prevista_minuti ? String(ev.durata_prevista_minuti) : "",
      note:                    ev.note,
      stato:                   ev.stato as EventoStato,
      categoria:               (ev.categoria as EventoCategoria) ?? "stampe",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setFileToUpload(null)
  }

  function setField<K extends keyof EventForm>(k: K, v: EventForm[K]) {
    setForm(f => {
      const updated = { ...f, [k]: v }
      if (k === "cliente_id") updated.progetto_id = "__none__"
      return updated
    })
  }

  const todayKey = toDateKey(now)

  return (
    <PageLayout
      title="Pianificazione"
      description="Calendario operativo: stampe, manutenzioni e appuntamenti"
      actions={
        <Button onClick={() => openCreate()} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo evento
        </Button>
      }
    >
      {/* ─── Filtro categoria ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategoria("")}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: !filterCategoria ? "var(--accent)" : "var(--muted-bg)",
            color: !filterCategoria ? "#fff" : "var(--muted-text)",
          }}
        >
          Tutti
        </button>
        {EVENTO_CATEGORIE.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategoria(cat === filterCategoria ? "" : cat)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: filterCategoria === cat
                ? `color-mix(in srgb, ${CATEGORIA_COLORS[cat].color} 15%, transparent)`
                : "var(--muted-bg)",
              color: filterCategoria === cat ? CATEGORIA_COLORS[cat].color : "var(--muted-text)",
              border: filterCategoria === cat ? `1px solid color-mix(in srgb, ${CATEGORIA_COLORS[cat].color} 40%, transparent)` : "1px solid transparent",
            }}
          >
            {CATEGORIA_COLORS[cat].label}
          </button>
        ))}
        {filterCategoria && (
          <span className="text-xs" style={{ color: "var(--muted-text)" }}>
            {eventiFiltrati.length} event{eventiFiltrati.length !== 1 ? "i" : "o"}
          </span>
        )}
      </div>

      {/* ─── Header calendario ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "var(--muted-text)" }} />
          </button>
          <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {MESI_IT[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "var(--muted-text)" }} />
          </button>
        </div>

        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 mb-1">
          {GIORNI_SETTIMANA.map(g => (
            <div key={g} className="text-center text-xs font-medium py-1" style={{ color: "var(--muted-text)" }}>
              {g}
            </div>
          ))}
        </div>

        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-px" style={{ background: "var(--border)" }}>
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} style={{ background: "var(--card-bg)" }} className="min-h-[80px]" />
            }
            const key = toDateKey(day)
            const dayEvents = eventiPerGiorno[key] || []
            const isToday = key === todayKey
            return (
              <div
                key={key}
                onClick={() => openCreate(day)}
                className="min-h-[80px] p-1.5 cursor-pointer hover:brightness-95 transition-all"
                style={{ background: "var(--card-bg)" }}
              >
                <div
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "text-white" : ""}`}
                  style={isToday ? { background: "var(--accent)" } : { color: "var(--muted-text)" }}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => {
                    const catColor = CATEGORIA_COLORS[(ev.categoria as EventoCategoria) ?? "stampe"]?.color ?? "var(--accent)"
                    return (
                      <button
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev) }}
                        className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: STATO_BG[ev.stato as EventoStato] ?? "var(--muted-bg)",
                          color: STATO_COLORS[ev.stato as EventoStato] ?? "var(--muted-text)",
                          borderLeft: `2px solid ${catColor}`,
                        }}
                      >
                        {ev.titolo}
                      </button>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <p className="text-xs pl-1" style={{ color: "var(--muted-text)" }}>
                      +{dayEvents.length - 3} altri
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Legenda ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-3">
          {EVENTO_STATI.map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: STATO_BG[s], border: `1px solid ${STATO_COLORS[s]}` }} />
              <span className="text-xs" style={{ color: "var(--muted-text)" }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {EVENTO_CATEGORIE.map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-1 h-4 rounded-full" style={{ background: CATEGORIA_COLORS[cat].color }} />
              <span className="text-xs" style={{ color: "var(--muted-text)" }}>{CATEGORIA_COLORS[cat].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Dialog creazione/modifica ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text)" }}>
              {editing ? "Modifica evento" : "Nuovo evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                {EVENTO_CATEGORIE.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setField("categoria", cat)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.categoria === cat
                        ? `color-mix(in srgb, ${CATEGORIA_COLORS[cat].color} 15%, transparent)`
                        : "var(--muted-bg)",
                      color: form.categoria === cat ? CATEGORIA_COLORS[cat].color : "var(--muted-text)",
                      border: form.categoria === cat
                        ? `1px solid color-mix(in srgb, ${CATEGORIA_COLORS[cat].color} 40%, transparent)`
                        : "1px solid transparent",
                    }}
                  >
                    {CATEGORIA_COLORS[cat].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Titolo */}
            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input
                value={form.titolo}
                onChange={e => setField("titolo", e.target.value)}
                placeholder={
                  form.categoria === "manutenzione" ? "es. Lubrificazione assi" :
                  form.categoria === "appuntamenti" ? "es. Incontro con cliente" :
                  "Nome dell'evento di stampa"
                }
              />
            </div>

            {/* Stampante (solo per manutenzione) */}
            {form.categoria === "manutenzione" && (
              <div className="space-y-1.5">
                <Label>Stampante</Label>
                <Select value={form.printer_id} onValueChange={v => setField("printer_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stampante..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuna stampante</SelectItem>
                    {stampanti.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <div className="flex items-center gap-2">
                          <Printer className="h-3 w-3" />
                          {p.asset_name || `${p.marca} ${p.modello}`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cliente + Progetto (per stampe) */}
            {form.categoria === "stampe" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setField("cliente_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessun cliente</SelectItem>
                      {clienti.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome} {c.cognome}{c.azienda ? ` — ${c.azienda}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Progetto</Label>
                  <Select
                    value={form.progetto_id}
                    onValueChange={v => setField("progetto_id", v)}
                    disabled={progettiFiltrati.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessun progetto</SelectItem>
                      {progettiFiltrati.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Data/ora inizio + fine */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inizio *</Label>
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={e => setField("start_at", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fine</Label>
                <Input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={e => setField("end_at", e.target.value)}
                />
              </div>
            </div>

            {/* Durata prevista */}
            <div className="space-y-1.5">
              <Label>Durata prevista (minuti)</Label>
              <Input
                type="number"
                min={1}
                value={form.durata_prevista_minuti}
                onChange={e => setField("durata_prevista_minuti", e.target.value)}
                placeholder="Es. 120"
              />
            </div>

            {/* Stato */}
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={v => setField("stato", v as EventoStato)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENTO_STATI.map(s => (
                    <SelectItem key={s} value={s}>
                      <span style={{ color: STATO_COLORS[s] }}>{s}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File di stampa */}
            <div className="space-y-1.5">
              <Label>File allegato</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                  {fileToUpload ? fileToUpload.name : editing?.file_name ? editing.file_name : "Allega file"}
                </Button>
                {editing?.file_name && !fileToUpload && (
                  <a
                    href={api.pianificazione.fileUrl(editing.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--accent)" }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="h-3 w-3" />
                    Scarica
                  </a>
                )}
                {fileToUpload && (
                  <button
                    type="button"
                    onClick={() => { setFileToUpload(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                    className="text-xs"
                    style={{ color: "var(--error)" }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => setFileToUpload(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                value={form.note}
                onChange={e => setField("note", e.target.value)}
                placeholder="Istruzioni, commenti, dettagli..."
                rows={3}
              />
            </div>

            {/* Riepilogo se modifica */}
            {editing && (
              <div className="rounded-lg px-3 py-2 text-xs space-y-0.5" style={{ background: "var(--muted-bg)", color: "var(--muted-text)" }}>
                {editing.cliente_nome && <p>Cliente: <span style={{ color: "var(--text)" }}>{editing.cliente_nome}</span></p>}
                {editing.progetto_nome && <p>Progetto: <span style={{ color: "var(--text)" }}>{editing.progetto_nome}</span></p>}
                {editing.printer_nome && <p>Stampante: <span style={{ color: "var(--text)" }}>{editing.printer_nome}</span></p>}
                <p>Creato: <span style={{ color: "var(--text)" }}>{formatDisplay(editing.created_at)}</span></p>
              </div>
            )}

            {/* Azioni */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(editing.id)}
                    disabled={deleteMutation.isPending}
                    style={{ color: "var(--error)", borderColor: "var(--error)" }}
                  >
                    Elimina
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={closeDialog}>Annulla</Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.titolo || !form.start_at || saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Salvataggio..." : editing ? "Aggiorna" : "Crea evento"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Lista eventi del mese ─────────────────────────────────────────── */}
      {eventiFiltrati.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <Calendar className="h-4 w-4" style={{ color: "var(--muted-text)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {eventiFiltrati.length} event{eventiFiltrati.length !== 1 ? "i" : "o"} — {MESI_IT[viewMonth]} {viewYear}
              {filterCategoria && ` · ${CATEGORIA_COLORS[filterCategoria].label}`}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {eventiFiltrati.map(ev => {
              const catColor = CATEGORIA_COLORS[(ev.categoria as EventoCategoria) ?? "stampe"]?.color ?? "var(--accent)"
              return (
                <button
                  key={ev.id}
                  onClick={() => openEdit(ev)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--muted-bg)] transition-colors flex items-start gap-3"
                >
                  <div
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: catColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{ev.titolo}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                      {formatDisplay(ev.start_at)}
                      {ev.cliente_nome && ` · ${ev.cliente_nome}`}
                      {ev.progetto_nome && ` · ${ev.progetto_nome}`}
                      {ev.printer_nome && ` · ${ev.printer_nome}`}
                    </p>
                  </div>
                  <Badge
                    className="shrink-0 text-xs"
                    style={{
                      background: STATO_BG[ev.stato as EventoStato] ?? "var(--muted-bg)",
                      color: STATO_COLORS[ev.stato as EventoStato] ?? "var(--muted-text)",
                      border: "none",
                    }}
                  >
                    {ev.stato}
                  </Badge>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </PageLayout>
  )
}
