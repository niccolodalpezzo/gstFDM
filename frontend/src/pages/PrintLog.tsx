import { useState, useRef, useEffect } from "react"
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { LogStampaCreate } from "@/types"

interface FormData {
  progetto_id: number
  stampante_id: number
  codice_bobina: string
  grammi_usati: number
  tempo_minuti: number
  costo_post_prod: number
  costo_extra: number
  costo_packaging: number
}

const EMPTY_DEFAULTS: Partial<FormData> = {
  grammi_usati: 0,
  tempo_minuti: 0,
  costo_post_prod: 0,
  costo_extra: 0,
  costo_packaging: 0,
}

async function parseGcode3mf(file: File): Promise<{ tempo_minuti: number; grammi_usati: number }> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(file)

  // Prova slice_info.config (OrcaSlicer / BambuStudio)
  const sliceInfo = zip.file("Metadata/slice_info.config")
  if (sliceInfo) {
    try {
      const json = JSON.parse(await sliceInfo.async("string"))
      const plate = json.plates?.[0]
      if (plate) {
        const prediction = plate.prediction ?? 0
        const weight = Array.isArray(plate.weight)
          ? plate.weight.reduce((a: number, b: number) => a + b, 0)
          : (plate.weight ?? 0)
        return {
          tempo_minuti: Math.round(prediction / 60),
          grammi_usati: parseFloat(Number(weight).toFixed(1)),
        }
      }
    } catch {
      // fallback
    }
  }

  // Fallback: header del G-code
  const gcodeEntry = zip.file(/^Metadata\/plate_\d+\.gcode$/)[0]
  if (gcodeEntry) {
    const header = (await gcodeEntry.async("string")).slice(0, 4000)
    const timeMatch = header.match(/estimated printing time[^\d]*(\d+)h[^\d]*(\d+)m/i)
    const gramsMatch = header.match(/filament used \[g\]\s*=\s*([\d.]+)/i)
    const tempo = timeMatch
      ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
      : 0
    return {
      tempo_minuti: tempo,
      grammi_usati: gramsMatch ? parseFloat(gramsMatch[1]) : 0,
    }
  }

  return { tempo_minuti: 0, grammi_usati: 0 }
}

export default function PrintLog() {
  const toast = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingValues, setPendingValues] = useState<{ tempo_minuti: number; grammi_usati: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialogOpen && pendingValues) {
      setValue("tempo_minuti", pendingValues.tempo_minuti)
      setValue("grammi_usati", pendingValues.grammi_usati)
      setPendingValues(null)
    }
  }, [dialogOpen, pendingValues])

  const { data: progetti = [] } = useQuery({ queryKey: ["progetti"], queryFn: api.progetti.list })
  const { data: stampanti = [] } = useQuery({ queryKey: ["stampanti"], queryFn: api.stampanti.list })
  const { data: bobine = [] } = useQuery({ queryKey: ["magazzino"], queryFn: api.magazzino.list })

  const bobineAttive = bobine.filter(b => b.stato === "Usata")

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: EMPTY_DEFAULTS,
  })

  const progettoId = watch("progetto_id")
  const stampanteId = watch("stampante_id")
  const codiceBobina = watch("codice_bobina")

  const logMutation = useMutation({
    mutationFn: (data: LogStampaCreate) => api.logStampe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      reset(EMPTY_DEFAULTS)
      setDialogOpen(false)
      toast("Print log salvato", "success")
    },
    onError: (err) => toast(`Errore: ${(err as Error).message}`, "error"),
  })

  const onSubmit = (data: FormData) => {
    logMutation.mutate(data as LogStampaCreate)
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const { tempo_minuti, grammi_usati } = await parseGcode3mf(file)
      reset(EMPTY_DEFAULTS)
      setPendingValues({ tempo_minuti, grammi_usati })
      setDialogOpen(true)
    } catch {
      toast("Impossibile leggere il file .3mf", "error")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const form = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Progetto */}
      <div className="space-y-1">
        <Label>Project *</Label>
        <Select
          value={progettoId?.toString()}
          onValueChange={v => setValue("progetto_id", parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {progetti.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.nome} ({p.cliente || "–"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stampante */}
      <div className="space-y-1">
        <Label>Printer *</Label>
        <Select
          value={stampanteId?.toString()}
          onValueChange={v => setValue("stampante_id", parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select printer" />
          </SelectTrigger>
          <SelectContent>
            {stampanti.map(s => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.marca} {s.modello}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bobina */}
      <div className="space-y-1">
        <Label>Spool code *</Label>
        <Select
          value={codiceBobina}
          onValueChange={v => setValue("codice_bobina", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select active spool" />
          </SelectTrigger>
          <SelectContent>
            {bobineAttive.map(b => (
              <SelectItem key={b.id} value={b.codice_univoco!}>
                [{b.codice_univoco}] {b.marca} {b.materiale} {b.colore} ({b.grammi_residui}g)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tempo e grammi */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Print time (minutes) *</Label>
          <Input
            type="number"
            step="1"
            min="0"
            {...register("tempo_minuti", { valueAsNumber: true })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Grams used *</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            {...register("grammi_usati", { valueAsNumber: true })}
            required
          />
        </div>
      </div>

      {/* Costi extra */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Post-proc. (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_post_prod", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Extra (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_extra", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Packaging (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_packaging", { valueAsNumber: true })} />
        </div>
      </div>

      <Button
        type="submit"
        disabled={logMutation.isPending || !progettoId || !stampanteId || !codiceBobina}
        className="w-full"
      >
        {logMutation.isPending ? "Saving..." : "Save Print Log"}
      </Button>
    </form>
  )

  return (
    <PageLayout
      title="Print Log"
      description="Registra tempi, consumo materiale e costi accessori delle stampe completate."
      actions={(
        <>
          <Button
            onClick={() => {
              reset(EMPTY_DEFAULTS)
              setDialogOpen(true)
            }}
          >
            + Aggiungi Log
          </Button>

          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? "Lettura..." : "Importa .gcode.3mf"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".3mf"
            className="hidden"
            onChange={handleFileImport}
          />
        </>
      )}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>Aggiungi stampa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            Carica un file `.3mf` per precompilare tempo e materiale oppure inserisci manualmente i dati della stampa.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) reset(EMPTY_DEFAULTS); setDialogOpen(open) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Print Details</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
