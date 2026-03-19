import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Printer, Settings, Plus, Trash2, Clock, Box, Cpu, Zap } from "lucide-react"
import type { Stampante, StampanteCreate, ComponentReplacement } from "@/types"

// ─── Printer Catalog ──────────────────────────────────────────────────────────

const PRINTER_CATALOG: Record<string, Record<string, string[]>> = {
  "Bambu Lab": {
    "P1 Series": ["P1P", "P1S"],
    "X1 Series": ["X1-Carbon", "X1E"],
    "A1 Series": ["A1", "A1 mini"],
  },
  "Anycubic": {
    "Kobra 2 Series": ["Kobra 2", "Kobra 2 Pro", "Kobra 2 Max"],
    "Kobra 3 Series": ["Kobra 3", "Kobra 3 Combo"],
    "Kobra S1 Series": ["Kobra S1 Combo", "Kobra S1 Max"],
  },
  "Creality": {
    "Ender Series": ["Ender-3 V3", "Ender-3 S1", "Ender-5 S1"],
    "K Series": ["K1", "K1 Max", "K1C"],
    "CR Series": ["CR-10 SE", "CR-M4"],
  },
  "Prusa Research": {
    "MK Series": ["MK3S+", "MK4"],
    "MINI Series": ["MINI+"],
    "XL Series": ["Prusa XL"],
  },
  "Elegoo": {
    "Neptune 3 Series": ["Neptune 3 Pro", "Neptune 3 Plus", "Neptune 3 Max"],
    "Neptune 4 Series": ["Neptune 4", "Neptune 4 Pro", "Neptune 4 Plus", "Neptune 4 Max"],
    "Centauri Series": ["Centauri Carbon"],
  },
}

const STATUS_CFG = {
  Idle:        { color: "#22c55e" },
  Printing:    { color: "#3b82f6" },
  Maintenance: { color: "#f59e0b" },
} as const

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CFG[(status ?? "Idle") as keyof typeof STATUS_CFG] ?? STATUS_CFG.Idle
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
      style={{
        background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
        color: cfg.color,
        border: `1px solid color-mix(in srgb, ${cfg.color} 35%, transparent)`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {status}
    </span>
  )
}

// ─── Hardware Onboarding Form ─────────────────────────────────────────────────

type OnboardingData = Omit<StampanteCreate, "marca" | "modello" | "status">

function HardwareOnboardingForm({
  onSubmit, isPending,
}: { onSubmit: (d: StampanteCreate) => void; isPending: boolean }) {
  const [brand,  setBrand]  = useState("")
  const [series, setSeries] = useState("")
  const [model,  setModel]  = useState("")

  const { register, handleSubmit } = useForm<OnboardingData>({
    defaultValues: {
      consumo_w: 350, costo_acquisto: 0, ammortamento_orario: 0,
      diametro_ugello: 0.4, initial_runtime_hours: 0,
      build_volume_x: 0, build_volume_y: 0, build_volume_z: 0,
    },
  })

  const brands  = Object.keys(PRINTER_CATALOG)
  const seriess = brand  ? Object.keys(PRINTER_CATALOG[brand] ?? {}) : []
  const models  = series ? (PRINTER_CATALOG[brand]?.[series] ?? [])  : []

  const onBrand  = (v: string) => { setBrand(v); setSeries(""); setModel("") }
  const onSeries = (v: string) => { setSeries(v); setModel("") }

  const submit = (d: OnboardingData) => {
    if (!model) return
    onSubmit({ ...d, marca: brand, modello: model, status: "Idle" })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-2">
      {/* Dependent dropdowns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Manufacturer *</Label>
          <Select value={brand || "__none__"} onValueChange={v => onBrand(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select brand</SelectItem>
              {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Series *</Label>
          <Select value={series || "__none__"} onValueChange={v => onSeries(v === "__none__" ? "" : v)} disabled={!brand}>
            <SelectTrigger><SelectValue placeholder="Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select series</SelectItem>
              {seriess.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Model *</Label>
          <Select value={model || "__none__"} onValueChange={v => setModel(v === "__none__" ? "" : v)} disabled={!series}>
            <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select model</SelectItem>
              {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Asset Alias</Label>
        <Input {...register("asset_name")} placeholder="e.g. Main Farm — Unit #1" />
      </div>

      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Build Volume (mm)</p>
        <div className="grid grid-cols-3 gap-3">
          {(["build_volume_x", "build_volume_y", "build_volume_z"] as const).map((field, i) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs" style={{ color: "var(--muted-text)" }}>{["X", "Y", "Z"][i]}</Label>
              <Input type="number" min="0" {...register(field, { valueAsNumber: true })} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Power Consumption (W) *</Label>
          <Input type="number" step="1" min="0" {...register("consumo_w", { valueAsNumber: true })} required />
        </div>
        <div className="space-y-1">
          <Label>Nozzle Diameter (mm)</Label>
          <Input type="number" step="0.05" min="0" {...register("diametro_ugello", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Acquisition Cost (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_acquisto", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Hourly Depreciation (€/h)</Label>
          <Input type="number" step="0.001" min="0" {...register("ammortamento_orario", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Initial Runtime (h)</Label>
        <Input type="number" step="0.1" min="0" {...register("initial_runtime_hours", { valueAsNumber: true })} />
        <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
          Accumulated runtime hours prior to system registration
        </p>
      </div>

      <Button type="submit" disabled={isPending || !model} className="w-full">
        {isPending ? "Provisioning..." : "Provision Asset"}
      </Button>
    </form>
  )
}

// ─── Printer Settings Dialog ──────────────────────────────────────────────────

function PrinterSettingsDialog({
  printer, components, onSave, onDelete, isPending,
}: {
  printer: Stampante
  components: ComponentReplacement[]
  onSave: (d: StampanteCreate) => void
  onDelete: () => void
  isPending: boolean
}) {
  const [status,   setStatus]   = useState<"Idle" | "Printing" | "Maintenance">(
    (printer.status as "Idle" | "Printing" | "Maintenance") ?? "Idle"
  )
  const [nozzleId, setNozzleId] = useState(
    printer.active_nozzle_id != null ? String(printer.active_nozzle_id) : "__none__"
  )

  const { register, handleSubmit } = useForm<Omit<StampanteCreate, "status" | "active_nozzle_id">>({
    defaultValues: {
      marca: printer.marca, modello: printer.modello, asset_name: printer.asset_name,
      diametro_ugello: printer.diametro_ugello, consumo_w: printer.consumo_w,
      costo_acquisto: printer.costo_acquisto, ammortamento_orario: printer.ammortamento_orario,
      build_volume_x: printer.build_volume_x, build_volume_y: printer.build_volume_y,
      build_volume_z: printer.build_volume_z, initial_runtime_hours: printer.initial_runtime_hours,
    },
  })

  const assignedComponents = components.filter(c => c.stampante_ids.includes(printer.id))

  const submit = (d: Omit<StampanteCreate, "status" | "active_nozzle_id">) => {
    onSave({
      ...d, status,
      active_nozzle_id: nozzleId !== "__none__" ? Number(nozzleId) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Asset Alias</Label>
          <Input {...register("asset_name")} />
        </div>
        <div className="space-y-1">
          <Label>Operational Status</Label>
          <Select value={status} onValueChange={v => setStatus(v as "Idle" | "Printing" | "Maintenance")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Idle">Idle</SelectItem>
              <SelectItem value="Printing">Printing</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Manufacturer</Label>
          <Input {...register("marca")} />
        </div>
        <div className="space-y-1">
          <Label>Model</Label>
          <Input {...register("modello")} />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Build Volume (mm)</p>
        <div className="grid grid-cols-3 gap-3">
          {(["build_volume_x", "build_volume_y", "build_volume_z"] as const).map((field, i) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs" style={{ color: "var(--muted-text)" }}>{["X", "Y", "Z"][i]}</Label>
              <Input type="number" min="0" {...register(field, { valueAsNumber: true })} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Power Consumption (W)</Label>
          <Input type="number" step="1" min="0" {...register("consumo_w", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Nozzle Diameter (mm)</Label>
          <Input type="number" step="0.05" min="0" {...register("diametro_ugello", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Acquisition Cost (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_acquisto", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Hourly Depreciation (€/h)</Label>
          <Input type="number" step="0.001" min="0" {...register("ammortamento_orario", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Initial Runtime (h)</Label>
        <Input type="number" step="0.1" min="0" {...register("initial_runtime_hours", { valueAsNumber: true })} />
      </div>

      <div className="space-y-1">
        <Label>Active Nozzle</Label>
        <Select value={nozzleId} onValueChange={setNozzleId}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {assignedComponents.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>
                [{c.asset_uid}] {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignedComponents.length === 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--muted-text)" }}>
            Assign components to this printer via Inventory → Component Replacements
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Saving..." : "Save Configuration"}
        </Button>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          }
          description={`Decommission ${printer.asset_name || printer.modello}? This action is irreversible.`}
          onConfirm={onDelete}
        />
      </div>
    </form>
  )
}

// ─── Printer Card ─────────────────────────────────────────────────────────────

function PrinterCard({
  printer, components, onUpdate, onDelete, isPending,
}: {
  printer: Stampante
  components: ComponentReplacement[]
  onUpdate: (d: StampanteCreate) => void
  onDelete: () => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const displayName = printer.asset_name || `${printer.marca} ${printer.modello}`
  const hasVolume   = (printer.build_volume_x ?? 0) > 0

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Visual area */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: 148,
          background: "color-mix(in srgb, var(--accent) 6%, transparent)",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <Printer
          className="h-16 w-16"
          style={{ color: "color-mix(in srgb, var(--accent) 55%, var(--muted-text))" }}
        />
        {/* Status indicator top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={printer.status} />
        </div>
      </div>

      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Title */}
        <div>
          <p className="font-bold text-base leading-tight truncate" style={{ color: "var(--text)" }}>
            {displayName}
          </p>
          {printer.asset_name && (
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
              {printer.marca} {printer.modello}
            </p>
          )}
        </div>

        {/* Runtime bar */}
        <div
          className="rounded-lg px-3 py-2 space-y-1"
          style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1" style={{ color: "var(--muted-text)" }}>
              <Clock className="h-3 w-3" />
              <span className="font-medium uppercase tracking-wider">Accumulated Runtime</span>
            </div>
            <span className="font-bold tabular-nums" style={{ color: "var(--accent)" }}>
              {(printer.accumulated_runtime_hours ?? 0).toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Specs */}
        <div className="space-y-1 text-xs" style={{ color: "var(--muted-text)" }}>
          {hasVolume && (
            <div className="flex items-center gap-1.5">
              <Box className="h-3 w-3 flex-shrink-0" />
              <span>{printer.build_volume_x}×{printer.build_volume_y}×{printer.build_volume_z} mm</span>
            </div>
          )}
          {printer.active_nozzle_uid && (
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                <span className="font-mono">{printer.active_nozzle_uid}</span>
                {printer.active_nozzle_name ? ` — ${printer.active_nozzle_name}` : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 flex-shrink-0" />
            <span>{printer.consumo_w}W · ø{printer.diametro_ugello}mm · €{printer.ammortamento_orario}/h</span>
          </div>
        </div>

        {/* Settings button */}
        <div className="mt-auto pt-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Asset Configuration — {displayName}</DialogTitle>
              </DialogHeader>
              <PrinterSettingsDialog
                printer={printer}
                components={components}
                onSave={d => { onUpdate(d); setOpen(false) }}
                onDelete={() => { onDelete(); setOpen(false) }}
                isPending={isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Stampanti() {
  const toast   = useToast()
  const [addOpen, setAddOpen] = useState(false)

  const { data: stampanti  = [], isLoading } = useQuery({ queryKey: ["stampanti"],              queryFn: api.stampanti.list })
  const { data: components = [] }            = useQuery({ queryKey: ["component-replacements"], queryFn: api.componentReplacements.list })

  const createMutation = useMutation({
    mutationFn: api.stampanti.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stampanti"] }); setAddOpen(false); toast("Asset provisioned", "success") },
    onError:   () => toast("Provisioning failed", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StampanteCreate }) => api.stampanti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stampanti"] })
      queryClient.invalidateQueries({ queryKey: ["component-replacements"] })
      toast("Configuration saved", "success")
    },
    onError: () => toast("Update failed", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.stampanti.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stampanti"] }); toast("Asset decommissioned", "success") },
    onError:   () => toast("Decommission failed", "error"),
  })

  const stats = {
    total:       stampanti.length,
    printing:    stampanti.filter(s => (s.status ?? "Idle") === "Printing").length,
    maintenance: stampanti.filter(s => (s.status ?? "Idle") === "Maintenance").length,
    runtime:     stampanti.reduce((a, s) => a + (s.accumulated_runtime_hours ?? 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Printer Fleet</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
            Hardware provisioning & runtime analytics
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Provision Asset</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Hardware Onboarding</DialogTitle></DialogHeader>
            <HardwareOnboardingForm
              onSubmit={d => createMutation.mutate(d)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Fleet KPIs */}
      {stampanti.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Assets",     value: stats.total },
            { label: "Printing",         value: stats.printing },
            { label: "Maintenance",      value: stats.maintenance },
            { label: "Fleet Runtime",    value: `${stats.runtime.toFixed(0)}h` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <p className="opacity-50 text-sm">Loading fleet data...</p>
      ) : stampanti.length === 0 ? (
        <div
          className="rounded-xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--card-border)" }}
        >
          <Printer className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium" style={{ color: "var(--text)" }}>No assets provisioned</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
            Click "Provision Asset" to register your first printer
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stampanti.map(p => (
            <PrinterCard
              key={p.id}
              printer={p}
              components={components}
              onUpdate={d  => updateMutation.mutate({ id: p.id, data: d })}
              onDelete={() => deleteMutation.mutate(p.id)}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
