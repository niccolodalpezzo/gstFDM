import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  PackagePlus,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  TriangleAlert,
  Wrench,
} from "lucide-react"

import { EmptyState, PageLayout } from "@/components/layout/PageLayout"
import { ConfigCheckBanner } from "@/components/shared/ConfigCheckBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { formatEur, formatPerc } from "@/lib/utils"
import type {
  BobinaFilamento,
  Cliente,
  Preventivo,
  PreventivoInput,
  PreventivoListItem,
  PreventivoPreview,
  PreventivoStato,
  Settings,
  Stampante,
} from "@/types"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function statoVariant(stato: PreventivoStato) {
  if (stato === "confermato" || stato === "convertito") return "success" as const
  if (stato === "annullato") return "destructive" as const
  return "warning" as const
}

function statoLabel(stato: PreventivoStato) {
  const labels: Record<PreventivoStato, string> = {
    bozza: "Bozza",
    confermato: "Confermato",
    annullato: "Annullato",
    convertito: "Convertito",
  }
  return labels[stato]
}

function clienteLabel(cliente: Cliente) {
  return cliente.azienda?.trim() || `${cliente.nome} ${cliente.cognome}`.trim()
}

function stampanteLabel(stampante: Stampante) {
  return stampante.asset_name?.trim() || `${stampante.marca} ${stampante.modello}`.trim()
}

function toNullableNumber(value: string) {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function createDefaultInput(settings: Settings | undefined, printers: Stampante[]): PreventivoInput {
  return {
    numero_preventivo: null,
    data: todayIso(),
    cliente_id: null,
    cliente_nome_snapshot: "",
    progetto_nome: "",
    stampante_id: printers[0]?.id ?? 0,
    stato: "bozza",
    quantita: 1,
    ore_stampa: 0,
    minuti_setup: 0,
    costo_progettazione: 0,
    costo_packing: 0,
    costo_spedizione: 0,
    costo_extra_manual: 0,
    margine_lordo_perc: settings?.margine_lordo_default_perc ?? 35,
    override_rischio_perc: null,
    note: "",
    materiali: [
      {
        magazzino_id: null,
        materiale_nome: "",
        marca: "",
        colore: "",
        costo_kg: null,
        grammi_modello: 0,
        scarto_perc: null,
        energy_multiplier: null,
        risk_perc: null,
      },
    ],
    post_produzione: [],
    componenti_extra: [],
  }
}

function preventivoToInput(preventivo: Preventivo): PreventivoInput {
  return {
    numero_preventivo: preventivo.numero_preventivo,
    data: preventivo.data,
    cliente_id: preventivo.cliente_id,
    cliente_nome_snapshot: preventivo.cliente_nome_snapshot,
    progetto_nome: preventivo.progetto_nome,
    stampante_id: preventivo.stampante_id,
    stato: preventivo.stato,
    quantita: preventivo.quantita,
    ore_stampa: preventivo.ore_stampa,
    minuti_setup: preventivo.minuti_setup,
    costo_progettazione: preventivo.costo_progettazione,
    costo_packing: preventivo.costo_packing,
    costo_spedizione: preventivo.costo_spedizione,
    costo_extra_manual: preventivo.costo_extra_manual,
    margine_lordo_perc: preventivo.margine_lordo_perc,
    override_rischio_perc: preventivo.override_rischio_perc,
    note: preventivo.note,
    materiali: preventivo.materiali.length > 0
      ? preventivo.materiali.map(materiale => ({
          magazzino_id: materiale.magazzino_id,
          materiale_nome: materiale.materiale_nome_snapshot,
          marca: materiale.marca_snapshot,
          colore: materiale.colore_snapshot,
          costo_kg: materiale.costo_kg_snapshot,
          grammi_modello: materiale.grammi_modello,
          scarto_perc: materiale.scarto_perc,
          energy_multiplier: materiale.energy_multiplier_snapshot,
          risk_perc: materiale.risk_perc_snapshot,
        }))
      : createDefaultInput(undefined, []).materiali,
    post_produzione: preventivo.post_produzione.map(item => ({
      descrizione: item.descrizione,
      minuti: item.minuti,
      costo_manual: item.costo_manual,
    })),
    componenti_extra: preventivo.componenti_extra.map(item => ({
      descrizione: item.descrizione,
      quantita: item.quantita,
      costo_unitario: item.costo_unitario,
    })),
  }
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function BreakdownRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span style={{ color: highlight ? "var(--text)" : "var(--muted-text)" }}>{label}</span>
      <span className="tabular-nums font-medium" style={{ color: highlight ? "var(--text)" : "var(--text-secondary)" }}>
        {formatEur(value)}
      </span>
    </div>
  )
}

export default function Preventivi() {
  const navigate = useNavigate()
  const toast = useToast()
  const lastSavedRef = useRef("")
  const previewTimerRef = useRef<number | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<PreventivoInput | null>(null)
  const [preview, setPreview] = useState<PreventivoPreview | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })

  const { data: quoteList = [], isLoading: listLoading } = useQuery({
    queryKey: ["preventivi"],
    queryFn: api.preventivi.list,
  })

  const { data: printers = [] } = useQuery({
    queryKey: ["preventivi-options-printers"],
    queryFn: api.preventivi.options.printers,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ["preventivi-options-materials"],
    queryFn: api.preventivi.options.materials,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ["preventivi-options-clients"],
    queryFn: api.preventivi.options.clients,
  })

  const selectedQuoteQuery = useQuery({
    queryKey: ["preventivo", selectedId],
    queryFn: () => api.preventivi.get(selectedId as number),
    enabled: selectedId !== null,
  })

  useEffect(() => {
    if (!selectedId && quoteList.length > 0) {
      setSelectedId(quoteList[0].id)
    }
  }, [quoteList, selectedId])

  useEffect(() => {
    if (!selectedQuoteQuery.data) return
    const nextDraft = preventivoToInput(selectedQuoteQuery.data)
    setDraft(nextDraft)
    setPreview({
      breakdown: selectedQuoteQuery.data.breakdown,
      materiali: selectedQuoteQuery.data.materiali,
      post_produzione: selectedQuoteQuery.data.post_produzione,
      componenti_extra: selectedQuoteQuery.data.componenti_extra,
    })
    lastSavedRef.current = JSON.stringify(nextDraft)
    setIsDirty(false)
  }, [selectedQuoteQuery.data])

  const createMutation = useMutation({
    mutationFn: api.preventivi.create,
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.setQueryData(["preventivo", result.id], result)
      setSelectedId(result.id)
      toast("Preventivo creato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nella creazione", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: PreventivoInput }) => api.preventivi.update(id, body),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.setQueryData(["preventivo", result.id], result)
      const nextDraft = preventivoToInput(result)
      lastSavedRef.current = JSON.stringify(nextDraft)
      setDraft(nextDraft)
      setPreview({
        breakdown: result.breakdown,
        materiali: result.materiali,
        post_produzione: result.post_produzione,
        componenti_extra: result.componenti_extra,
      })
      setIsDirty(false)
      toast("Preventivo salvato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nel salvataggio", "error"),
  })

  const recalculateMutation = useMutation({
    mutationFn: api.preventivi.recalculate,
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.setQueryData(["preventivo", result.id], result)
      setPreview({
        breakdown: result.breakdown,
        materiali: result.materiali,
        post_produzione: result.post_produzione,
        componenti_extra: result.componenti_extra,
      })
      toast("Preventivo ricalcolato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nel ricalcolo", "error"),
  })

  const confirmMutation = useMutation({
    mutationFn: api.preventivi.confirm,
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.setQueryData(["preventivo", result.id], result)
      toast("Preventivo confermato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nella conferma", "error"),
  })

  const convertMutation = useMutation({
    mutationFn: api.preventivi.convert,
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.setQueryData(["preventivo", result.id], result)
      toast("Preventivo convertito in ordine", "success")
      if (result.ordine_id) {
        navigate(`/produzione/ordini?id=${result.ordine_id}`)
      }
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nella conversione", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.preventivi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["preventivi"] })
      queryClient.removeQueries({ queryKey: ["preventivo", deletedId] })
      const nextId = quoteList.find(item => item.id !== deletedId)?.id ?? null
      setSelectedId(nextId)
      setDraft(null)
      setPreview(null)
      toast("Preventivo eliminato", "success")
    },
    onError: error => toast(error instanceof Error ? error.message : "Errore nell'eliminazione", "error"),
  })

  useEffect(() => {
    if (!draft) return
    const serialized = JSON.stringify(draft)
    const dirty = serialized !== lastSavedRef.current
    setIsDirty(dirty)

    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current)
    }
    previewTimerRef.current = window.setTimeout(async () => {
      if (!draft.stampante_id) return
      setIsPreviewLoading(true)
      try {
        const result = await api.preventivi.preview(draft)
        setPreview(result)
        setPreviewError(null)
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Errore nel preview costi")
      } finally {
        setIsPreviewLoading(false)
      }
    }, 380)

    return () => {
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current)
      }
    }
  }, [draft, toast])

  const currentQuote = selectedQuoteQuery.data
  const currentBreakdown = preview?.breakdown ?? currentQuote?.breakdown ?? null
  const readOnly = currentQuote?.stato === "confermato" || currentQuote?.stato === "convertito"

  const materialMap = useMemo(() => {
    const map = new Map<number, BobinaFilamento>()
    materials.forEach(item => map.set(item.id, item))
    return map
  }, [materials])

  const selectedClient = useMemo(
    () => clients.find(item => item.id === draft?.cliente_id) ?? null,
    [clients, draft?.cliente_id]
  )

  function updateDraft(updater: (current: PreventivoInput) => PreventivoInput) {
    setDraft(current => (current ? updater(current) : current))
  }

  function updateMaterial(index: number, patch: Partial<PreventivoInput["materiali"][number]>) {
    updateDraft(current => ({
      ...current,
      materiali: current.materiali.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }

  function updatePost(index: number, patch: Partial<PreventivoInput["post_produzione"][number]>) {
    updateDraft(current => ({
      ...current,
      post_produzione: current.post_produzione.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }

  function updateComponent(index: number, patch: Partial<PreventivoInput["componenti_extra"][number]>) {
    updateDraft(current => ({
      ...current,
      componenti_extra: current.componenti_extra.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }

  async function saveCurrent() {
    if (!selectedId || !draft) return null
    return updateMutation.mutateAsync({ id: selectedId, body: draft })
  }

  async function handleCreateQuote() {
    if (printers.length === 0) {
      toast("Serve almeno una stampante per creare un preventivo", "error")
      return
    }
    await createMutation.mutateAsync(createDefaultInput(settings, printers))
  }

  async function handleConfirm() {
    if (!selectedId) return
    if (isDirty) {
      await saveCurrent()
    }
    await confirmMutation.mutateAsync(selectedId)
  }

  async function handleConvert() {
    if (!selectedId) return
    if (isDirty) {
      await saveCurrent()
    }
    await convertMutation.mutateAsync(selectedId)
  }

  return (
    <PageLayout
      title="Preventivi"
      description="Snapshot commerciale del motore costi: calcolo pieno, margine lordo, breakdown interno e storico congelato."
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateQuote} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4" />
            Nuovo preventivo
          </Button>
        </div>
      }
    >
      <ConfigCheckBanner />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Elenco preventivi</CardTitle>
            <CardDescription>Bozze, conferme e conversioni con costo storico congelato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listLoading ? (
              <p className="text-sm opacity-60">Caricamento preventivi...</p>
            ) : quoteList.length === 0 ? (
              <EmptyState
                icon={<FileSpreadsheet />}
                title="Nessun preventivo"
                description="Crea la prima bozza per avviare il modulo commerciale."
                action={<Button onClick={handleCreateQuote}>Crea il primo preventivo</Button>}
              />
            ) : (
              quoteList.map((item: PreventivoListItem) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="w-full rounded-2xl border p-4 text-left transition-all"
                  style={{
                    borderColor: selectedId === item.id ? "var(--accent)" : "var(--card-border)",
                    background: selectedId === item.id
                      ? "color-mix(in srgb, var(--accent) 6%, var(--card-bg))"
                      : "var(--card-bg)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {item.numero_preventivo}
                      </p>
                      <p className="mt-1 truncate text-xs" style={{ color: "var(--muted-text)" }}>
                        {item.progetto_nome || "Progetto senza nome"}
                      </p>
                    </div>
                    <Badge variant={statoVariant(item.stato)}>{statoLabel(item.stato)}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--muted-text)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span>Cliente</span>
                      <span className="truncate text-right">{item.cliente_nome_snapshot || "Non assegnato"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Prezzo finale</span>
                      <span className="font-semibold" style={{ color: "var(--text)" }}>{formatEur(item.prezzo_finale)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Margine</span>
                      <span>{formatPerc(item.margine_lordo_perc)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {!draft || !selectedId ? (
          <Card>
            <CardContent className="py-20">
              <EmptyState
                icon={<Calculator />}
                title="Seleziona o crea un preventivo"
                description="Apri una bozza esistente oppure genera un nuovo preventivo per iniziare il calcolo commerciale."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_420px]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <span>{currentQuote?.numero_preventivo ?? "Preventivo"}</span>
                      {currentQuote && <Badge variant={statoVariant(currentQuote.stato)}>{statoLabel(currentQuote.stato)}</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Salva la bozza quando modifichi i dati. Il breakdown a destra si aggiorna in preview con debounce.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => recalculateMutation.mutate(selectedId)} disabled={recalculateMutation.isPending}>
                      <RefreshCcw className="h-4 w-4" />
                      Ricalcola
                    </Button>
                    <Button onClick={() => void saveCurrent()} disabled={updateMutation.isPending || !isDirty || readOnly}>
                      <Save className="h-4 w-4" />
                      Salva bozza
                    </Button>
                    <Button variant="soft" onClick={() => void handleConfirm()} disabled={confirmMutation.isPending || readOnly}>
                      <CheckCircle2 className="h-4 w-4" />
                      Conferma
                    </Button>
                    <Button variant="soft" onClick={() => void handleConvert()} disabled={convertMutation.isPending || currentQuote?.stato !== "confermato"}>
                      <FileSpreadsheet className="h-4 w-4" />
                      Converti in Ordine
                    </Button>
                    <Button variant="ghost" onClick={() => deleteMutation.mutate(selectedId)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <SectionCard title="Testata preventivo" description="Dati anagrafici, commessa, stampante e parametri base del documento.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Numero preventivo</Label>
                    <Input value={currentQuote?.numero_preventivo ?? "Generazione automatica"} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={draft.data}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, data: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantità</Label>
                    <Input
                      type="number"
                      min="1"
                      value={draft.quantita}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, quantita: Math.max(1, toNumber(event.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cliente</Label>
                    <Select
                      value={draft.cliente_id ? String(draft.cliente_id) : "none"}
                      onValueChange={value =>
                        updateDraft(current => ({
                          ...current,
                          cliente_id: value === "none" ? null : Number(value),
                          cliente_nome_snapshot: value === "none"
                            ? current.cliente_nome_snapshot
                            : clienteLabel(clients.find(item => item.id === Number(value)) ?? ({
                                id: 0,
                                nome: "",
                                cognome: "",
                                azienda: "",
                                email: "",
                                p_iva: "",
                                sdi: "",
                                cf: "",
                                indirizzo: "",
                                note: "",
                                data_aggiunta: null,
                              } as Cliente)),
                        }))
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun cliente</SelectItem>
                        {clients.map(cliente => (
                          <SelectItem key={cliente.id} value={String(cliente.id)}>
                            {clienteLabel(cliente)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome cliente snapshot</Label>
                    <Input
                      value={selectedClient ? clienteLabel(selectedClient) : draft.cliente_nome_snapshot}
                      disabled={!!selectedClient || readOnly}
                      onChange={event => updateDraft(current => ({ ...current, cliente_nome_snapshot: event.target.value }))}
                      placeholder="Cliente manuale o nominativo libero"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stampante selezionata</Label>
                    <Select
                      value={String(draft.stampante_id || 0)}
                      onValueChange={value => updateDraft(current => ({ ...current, stampante_id: Number(value) }))}
                      disabled={readOnly}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleziona stampante" /></SelectTrigger>
                      <SelectContent>
                        {printers.map(stampante => (
                          <SelectItem key={stampante.id} value={String(stampante.id)}>
                            {stampanteLabel(stampante)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome progetto / commessa</Label>
                    <Input
                      value={draft.progetto_nome}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, progetto_nome: event.target.value }))}
                      placeholder="Es. Scocca prototipo v2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Note commerciali</Label>
                    <Textarea
                      className="min-h-[44px]"
                      value={draft.note}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, note: event.target.value }))}
                      placeholder="Termini, note cliente, vincoli, condizioni..."
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Materiali"
                description="Griglia materiali con calcolo automatico peso totale e costo."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={readOnly}
                    onClick={() =>
                      updateDraft(current => ({
                        ...current,
                        materiali: [
                          ...current.materiali,
                          {
                            magazzino_id: null,
                            materiale_nome: "",
                            marca: "",
                            colore: "",
                            costo_kg: null,
                            grammi_modello: 0,
                            scarto_perc: null,
                            energy_multiplier: null,
                            risk_perc: null,
                          },
                        ],
                      }))
                    }
                  >
                    <PackagePlus className="h-4 w-4" />
                    Aggiungi riga
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-xs border-b" style={{ color: "var(--muted-text)", borderColor: "var(--card-border)" }}>
                        <th className="pb-2 pr-2 font-medium">Bobina</th>
                        <th className="pb-2 px-2 font-medium">Materiale</th>
                        <th className="pb-2 px-2 font-medium">Marca</th>
                        <th className="pb-2 px-2 font-medium">Colore</th>
                        <th className="pb-2 px-2 font-medium text-right">Peso (g)</th>
                        <th className="pb-2 px-2 font-medium text-right">Scarto %</th>
                        <th className="pb-2 px-2 font-medium text-right">Peso tot (g)</th>
                        <th className="pb-2 px-2 font-medium text-right">€/kg</th>
                        <th className="pb-2 px-2 font-medium text-right">Totale €</th>
                        <th className="pb-2 pl-2 font-medium w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.materiali.map((materiale, index) => {
                        const previewRow = preview?.materiali[index]
                        return (
                          <tr key={index} className="border-b" style={{ borderColor: "var(--card-border)" }}>
                            <td className="py-1.5 pr-2">
                              <Select
                                value={materiale.magazzino_id ? String(materiale.magazzino_id) : "manuale"}
                                onValueChange={value => {
                                  if (value === "manuale") {
                                    updateMaterial(index, { magazzino_id: null })
                                    return
                                  }
                                  const selected = materialMap.get(Number(value))
                                  updateMaterial(index, {
                                    magazzino_id: Number(value),
                                    materiale_nome: selected?.materiale ?? materiale.materiale_nome,
                                    marca: selected?.marca ?? materiale.marca,
                                    colore: selected?.colore ?? materiale.colore,
                                    costo_kg: selected?.costo_kg ?? materiale.costo_kg,
                                  })
                                }}
                                disabled={readOnly}
                              >
                                <SelectTrigger className="h-8 text-xs min-w-[140px]"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manuale">Manuale</SelectItem>
                                  {materials.map(item => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                      {item.marca} · {item.materiale} · {item.colore}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs" value={materiale.materiale_nome} disabled={readOnly} onChange={e => updateMaterial(index, { materiale_nome: e.target.value })} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs" value={materiale.marca} disabled={readOnly} onChange={e => updateMaterial(index, { marca: e.target.value })} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs" value={materiale.colore} disabled={readOnly} onChange={e => updateMaterial(index, { colore: e.target.value })} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs text-right tabular-nums w-20" type="number" min="0" value={materiale.grammi_modello} disabled={readOnly} onChange={e => updateMaterial(index, { grammi_modello: toNumber(e.target.value) })} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs text-right tabular-nums w-16" type="number" min="0" step="0.1" value={materiale.scarto_perc ?? ""} disabled={readOnly} onChange={e => updateMaterial(index, { scarto_perc: toNullableNumber(e.target.value) })} />
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums text-xs font-medium" style={{ color: "var(--muted-text)" }}>
                              {previewRow ? previewRow.grammi_totali.toFixed(1) : "—"}
                            </td>
                            <td className="py-1.5 px-2">
                              <Input className="h-8 text-xs text-right tabular-nums w-20" type="number" min="0" step="0.01" value={materiale.costo_kg ?? ""} disabled={readOnly} onChange={e => updateMaterial(index, { costo_kg: toNullableNumber(e.target.value) })} />
                            </td>
                            <td className="py-1.5 px-2 text-right tabular-nums text-xs font-semibold">
                              {previewRow ? formatEur(previewRow.costo_totale) : "—"}
                            </td>
                            <td className="py-1.5 pl-2">
                              {draft.materiali.length > 1 && (
                                <Button variant="ghost" size="icon-sm" disabled={readOnly} onClick={() => updateDraft(c => ({ ...c, materiali: c.materiali.filter((_, i) => i !== index) }))}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Parametri stampa e setup" description="Ore macchina, setup iniziale e costi di commessa.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Ore stampa</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.ore_stampa}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, ore_stampa: toNumber(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Minuti setup file</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.minuti_setup}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, minuti_setup: toNumber(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Costo progettazione</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.costo_progettazione}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, costo_progettazione: toNumber(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Extra manuale</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.costo_extra_manual}
                      disabled={readOnly}
                      onChange={event => updateDraft(current => ({ ...current, costo_extra_manual: toNumber(event.target.value) }))}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Post-produzione"
                description="Minuti di manodopera oppure costo diretto per riga."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={readOnly}
                    onClick={() =>
                      updateDraft(current => ({
                        ...current,
                        post_produzione: [...current.post_produzione, { descrizione: "", minuti: null, costo_manual: null }],
                      }))
                    }
                  >
                    <Wrench className="h-4 w-4" />
                    Aggiungi riga
                  </Button>
                }
              >
                {draft.post_produzione.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>Nessuna lavorazione post-produzione inserita.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-left text-xs border-b" style={{ color: "var(--muted-text)", borderColor: "var(--card-border)" }}>
                          <th className="pb-2 pr-2 font-medium">Descrizione</th>
                          <th className="pb-2 px-2 font-medium text-right">Minuti</th>
                          <th className="pb-2 px-2 font-medium text-right">Costo diretto (€)</th>
                          <th className="pb-2 px-2 font-medium text-right">Totale €</th>
                          <th className="pb-2 pl-2 font-medium w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.post_produzione.map((item, index) => {
                          const previewRow = preview?.post_produzione[index]
                          return (
                            <tr key={index} className="border-b" style={{ borderColor: "var(--card-border)" }}>
                              <td className="py-1.5 pr-2">
                                <Input className="h-8 text-xs" value={item.descrizione} disabled={readOnly} onChange={e => updatePost(index, { descrizione: e.target.value })} />
                              </td>
                              <td className="py-1.5 px-2">
                                <Input className="h-8 text-xs text-right tabular-nums w-20" type="number" min="0" value={item.minuti ?? ""} disabled={readOnly} onChange={e => updatePost(index, { minuti: toNullableNumber(e.target.value) })} />
                              </td>
                              <td className="py-1.5 px-2">
                                <Input className="h-8 text-xs text-right tabular-nums w-24" type="number" min="0" step="0.01" value={item.costo_manual ?? ""} disabled={readOnly} onChange={e => updatePost(index, { costo_manual: toNullableNumber(e.target.value) })} />
                              </td>
                              <td className="py-1.5 px-2 text-right tabular-nums text-xs font-semibold">
                                {previewRow ? formatEur(previewRow.costo_totale) : "—"}
                              </td>
                              <td className="py-1.5 pl-2">
                                <Button variant="ghost" size="icon-sm" disabled={readOnly} onClick={() => updateDraft(c => ({ ...c, post_produzione: c.post_produzione.filter((_, i) => i !== index) }))}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Extra componenti"
                description="Viti, magneti, inserti, LED, cavi, accessori o parti esterne."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={readOnly}
                    onClick={() =>
                      updateDraft(current => ({
                        ...current,
                        componenti_extra: [...current.componenti_extra, { descrizione: "", quantita: 1, costo_unitario: 0 }],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi riga
                  </Button>
                }
              >
                {draft.componenti_extra.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>Nessun componente extra inserito.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-left text-xs border-b" style={{ color: "var(--muted-text)", borderColor: "var(--card-border)" }}>
                          <th className="pb-2 pr-2 font-medium">Descrizione</th>
                          <th className="pb-2 px-2 font-medium text-right">Quantità</th>
                          <th className="pb-2 px-2 font-medium text-right">€/unità</th>
                          <th className="pb-2 px-2 font-medium text-right">Totale €</th>
                          <th className="pb-2 pl-2 font-medium w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.componenti_extra.map((item, index) => {
                          const previewRow = preview?.componenti_extra[index]
                          return (
                            <tr key={index} className="border-b" style={{ borderColor: "var(--card-border)" }}>
                              <td className="py-1.5 pr-2">
                                <Input className="h-8 text-xs" value={item.descrizione} disabled={readOnly} onChange={e => updateComponent(index, { descrizione: e.target.value })} />
                              </td>
                              <td className="py-1.5 px-2">
                                <Input className="h-8 text-xs text-right tabular-nums w-16" type="number" min="0" step="1" value={item.quantita} disabled={readOnly} onChange={e => updateComponent(index, { quantita: toNumber(e.target.value) })} />
                              </td>
                              <td className="py-1.5 px-2">
                                <Input className="h-8 text-xs text-right tabular-nums w-24" type="number" min="0" step="0.01" value={item.costo_unitario} disabled={readOnly} onChange={e => updateComponent(index, { costo_unitario: toNumber(e.target.value) })} />
                              </td>
                              <td className="py-1.5 px-2 text-right tabular-nums text-xs font-semibold">
                                {previewRow ? formatEur(previewRow.costo_totale) : formatEur(item.quantita * item.costo_unitario)}
                              </td>
                              <td className="py-1.5 pl-2">
                                <Button variant="ghost" size="icon-sm" disabled={readOnly} onClick={() => updateDraft(c => ({ ...c, componenti_extra: c.componenti_extra.filter((_, i) => i !== index) }))}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Packing, spedizione, rischio e margine" description="Campi commerciali finali e override difendibili sul preventivo.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Costo packing</Label>
                    <Input type="number" min="0" step="0.01" value={draft.costo_packing} disabled={readOnly} onChange={event => updateDraft(current => ({ ...current, costo_packing: toNumber(event.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Costo spedizione</Label>
                    <Input type="number" min="0" step="0.01" value={draft.costo_spedizione} disabled={readOnly} onChange={event => updateDraft(current => ({ ...current, costo_spedizione: toNumber(event.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Override rischio %</Label>
                    <Input type="number" step="0.1" value={draft.override_rischio_perc ?? ""} disabled={readOnly} onChange={event => updateDraft(current => ({ ...current, override_rischio_perc: toNullableNumber(event.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Margine lordo %</Label>
                    <Input type="number" min="0" step="0.1" value={draft.margine_lordo_perc} disabled={readOnly} onChange={event => updateDraft(current => ({ ...current, margine_lordo_perc: toNumber(event.target.value) }))} />
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6 sticky top-4 self-start">
              <SectionCard title="Riepilogo finale" description="Lato cliente: prezzo finale. Lato interno: costo pieno, utile lordo e breakdown completo.">
                {isPreviewLoading && (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>
                    Aggiornamento preview in corso...
                  </div>
                )}

                {previewError && (
                  <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--error, #ef4444) 35%, transparent)", background: "color-mix(in srgb, var(--error, #ef4444) 8%, transparent)", color: "var(--error, #ef4444)" }}>
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p>{previewError}</p>
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={{ background: "var(--error, #ef4444)", color: "#fff" }}
                          onClick={() => navigate("/impostazioni#filamenti")}
                        >
                          Vai a Impostazioni
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentBreakdown?.warning && (
                  <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)", background: "var(--warning-bg)", color: "var(--warning)" }}>
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{currentBreakdown.warning}</span>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="rounded-2xl">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-text)" }}>Prezzo finale cliente</p>
                      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
                        {formatEur(currentBreakdown?.prezzo_finale ?? 0)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted-text)" }}>Utile lordo interno</p>
                      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                        {formatEur(currentBreakdown?.utile_lordo ?? 0)}
                      </p>
                      <p className="mt-2 text-sm" style={{ color: "var(--muted-text)" }}>
                        Margine: {formatPerc(currentBreakdown?.margine_lordo_perc ?? 0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--card-border)" }}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Breakdown interno</p>
                    <Badge variant="secondary">Costo pieno {formatEur(currentBreakdown?.costo_pieno ?? 0)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <BreakdownRow label="Materiali" value={currentBreakdown?.costo_materiali ?? 0} />
                    <BreakdownRow label="Energia" value={currentBreakdown?.costo_energia ?? 0} />
                    <BreakdownRow label="Setup" value={currentBreakdown?.costo_setup ?? 0} />
                    <BreakdownRow label="Post-produzione" value={currentBreakdown?.costo_post_produzione ?? 0} />
                    <BreakdownRow label="Componenti extra" value={currentBreakdown?.costo_componenti_extra ?? 0} />
                    <BreakdownRow label="Packing" value={currentBreakdown?.costo_packing ?? 0} />
                    <BreakdownRow label="Spedizione" value={currentBreakdown?.costo_spedizione ?? 0} />
                    <BreakdownRow label="Costi fissi" value={currentBreakdown?.costo_costi_fissi ?? 0} />
                    <BreakdownRow label="Manutenzione ordinaria" value={currentBreakdown?.costo_manutenzione_ordinaria ?? 0} />
                    <BreakdownRow label="Manutenzione straordinaria" value={currentBreakdown?.costo_manutenzione_straordinaria ?? 0} />
                    <BreakdownRow label="Ammortamento stampante" value={currentBreakdown?.costo_ammortamento ?? 0} />
                    <BreakdownRow label="Straordinari struttura" value={currentBreakdown?.costo_straordinari_struttura ?? 0} />
                    <BreakdownRow label="Progettazione" value={currentBreakdown?.costo_progettazione ?? 0} />
                    <BreakdownRow label="Rischio stampa" value={currentBreakdown?.costo_rischio ?? 0} />
                    <BreakdownRow label="Extra manuale" value={currentBreakdown?.costo_extra_manual ?? 0} />
                    <div className="my-2 border-t" style={{ borderColor: "var(--card-border)" }} />
                    <BreakdownRow label="Costo pieno" value={currentBreakdown?.costo_pieno ?? 0} highlight />
                    <BreakdownRow label="Prezzo finale" value={currentBreakdown?.prezzo_finale ?? 0} highlight />
                    <BreakdownRow label="Utile lordo" value={currentBreakdown?.utile_lordo ?? 0} highlight />
                  </div>
                </div>

                {currentBreakdown && (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--card-border)" }}>
                    <p className="mb-3 font-semibold" style={{ color: "var(--text)" }}>Driver automatici</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl px-3 py-2" style={{ background: "var(--muted-bg)" }}>
                        <span style={{ color: "var(--muted-text)" }}>Moltiplicatore energia effettivo</span>
                        <p className="mt-1 font-semibold tabular-nums" style={{ color: "var(--text)" }}>{currentBreakdown.energy_multiplier_eff.toFixed(2)}x</p>
                      </div>
                      <div className="rounded-xl px-3 py-2" style={{ background: "var(--muted-bg)" }}>
                        <span style={{ color: "var(--muted-text)" }}>Rischio totale</span>
                        <p className="mt-1 font-semibold tabular-nums" style={{ color: "var(--text)" }}>{formatPerc(currentBreakdown.rischio_totale_perc)}</p>
                      </div>
                      <div className="rounded-xl px-3 py-2" style={{ background: "var(--muted-bg)" }}>
                        <span style={{ color: "var(--muted-text)" }}>Quota costi fissi oraria</span>
                        <p className="mt-1 font-semibold tabular-nums" style={{ color: "var(--text)" }}>{formatEur(currentBreakdown.quota_costi_fissi_oraria)}</p>
                      </div>
                      <div className="rounded-xl px-3 py-2" style={{ background: "var(--muted-bg)" }}>
                        <span style={{ color: "var(--muted-text)" }}>Quota manutenzione ordinaria oraria</span>
                        <p className="mt-1 font-semibold tabular-nums" style={{ color: "var(--text)" }}>{formatEur(currentBreakdown.quota_manutenzione_ordinaria_oraria)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
