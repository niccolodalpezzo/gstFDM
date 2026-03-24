import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { AlertTriangle, Box, Clock, Cpu, Layers3, Plus, Printer, Settings, Trash2, Wifi, WifiOff, Wrench, Zap } from "lucide-react"

import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import type { ComponentReplacement, PrinterLiveStatus, Stampante, StampanteCreate } from "@/types"

const PRINTER_CATALOG: Record<string, Record<string, string[]>> = {
  "Bambu Lab": { "A1 Series": ["A1", "A1 mini"], "P1 Series": ["P1P", "P1S"], "X1 Series": ["X1-Carbon", "X1E"] },
  "Anycubic": { "Kobra 3 Series": ["Kobra 3", "Kobra 3 Combo", "Kobra 3 Max"], "Kobra S1 Series": ["Kobra S1", "Kobra S1 Combo", "Kobra S1 Max"] },
  "Creality": { "K Series": ["K1", "K1C", "K1 Max"], "Ender Series": ["Ender-3 V3", "Ender-3 S1"] },
  "Prusa Research": { "MK Series": ["MK3S+", "MK4", "MK4S"], "XL Series": ["Prusa XL"] },
}

const STATUS_COLORS = { Idle: "#22c55e", Printing: "#3b82f6", Maintenance: "#f59e0b" } as const

// ─── Live status metadata ───────────────────────────────────────────────────

const CONN_STATE_META: Record<string, [string, string]> = {
  not_configured: ["#94a3b8", "Non configurata"],
  online:         ["#22c55e", "Online"],
  offline:        ["#ef4444", "Offline"],
  error:          ["#f59e0b", "Errore"],
  auth_required:  ["#f59e0b", "Credenziali mancanti"],
}

const PRINT_STATE_META: Record<string, [string, string]> = {
  unknown:   ["#94a3b8", "Stato sconosciuto"],
  idle:      ["#22c55e", "Idle"],
  printing:  ["#3b82f6", "Stampa in corso"],
  paused:    ["#f59e0b", "In pausa"],
  completed: ["#22c55e", "Completata"],
  error:     ["#ef4444", "Errore stampa"],
}

const PROVIDER_META: Record<string, [string, string]> = {
  unknown: ["#94a3b8", "–"],
  klipper: ["#22c55e", "Klipper"],
  bambu:   ["#3b82f6", "Bambu"],
}

function formatRemaining(sec: number | null): string | null {
  if (sec == null || sec <= 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m rimanenti`
  return `${m}m rimanenti`
}

// ─── Component helpers ───────────────────────────────────────────────────────

function normalizePartKind(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized.startsWith("piatto")) return "piatto"
  if (normalized === "modulo multicolore") return "multicolor"
  return normalized
}

function isPrinterCompatible(component: ComponentReplacement, printer: Stampante) {
  if (component.stampante_ids.includes(printer.id)) return true
  return component.compatibility_printers.some(rule => rule.brand.toLowerCase() === printer.marca.toLowerCase() && rule.model.toLowerCase() === printer.modello.toLowerCase())
}

function isPlateCompatible(component: ComponentReplacement, printer: Stampante) {
  if (isPrinterCompatible(component, printer)) return true
  const rules = component.compatibility_beds.length > 0
    ? component.compatibility_beds
    : component.bed_size_x && component.bed_size_y ? [{ label: "", size_x: component.bed_size_x, size_y: component.bed_size_y, tolerance_pct: 5 }] : []
  return rules.some(rule => {
    const tolerance = (rule.tolerance_pct ?? 5) / 100
    return rule.size_x >= printer.build_volume_x && rule.size_x <= printer.build_volume_x * (1 + tolerance) && rule.size_y >= printer.build_volume_y && rule.size_y <= printer.build_volume_y * (1 + tolerance)
  })
}

function isMulticolorCompatible(component: ComponentReplacement, printer: Stampante) {
  if (isPrinterCompatible(component, printer)) return true
  return component.compatibility_multicolor.some(profile => {
    if (profile.brand.toLowerCase() === printer.marca.toLowerCase()) return profile.compatible_models.some(model => model.toLowerCase() === printer.modello.toLowerCase())
    return profile.brand.toLowerCase() === "klipper / open" && !["bambu lab", "anycubic", "prusa research"].includes(printer.marca.toLowerCase())
  })
}

function compatibleComponents(printer: Stampante, components: ComponentReplacement[], slot: "nozzle" | "plate" | "multicolor") {
  return components.filter(component => {
    const kind = normalizePartKind(component.tipo_pezzo)
    if (slot === "nozzle") return kind === "nozzle" && isPrinterCompatible(component, printer)
    if (slot === "plate") return kind === "piatto" && isPlateCompatible(component, printer)
    return kind === "multicolor" && isMulticolorCompatible(component, printer)
  })
}

function Pill({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{label}</span>
}


// ─── Live Status Section (shown inside PrinterCard) ──────────────────────────

function LiveStatusSection({ ls, host }: { ls: PrinterLiveStatus | null | undefined; host: string | null | undefined }) {
  if (!host) {
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #94a3b8 8%, transparent)", border: "1px solid color-mix(in srgb, #94a3b8 25%, transparent)", color: "#94a3b8" }}>
        <div className="flex items-center gap-1.5"><WifiOff className="h-3 w-3" /><span>Rete non configurata</span></div>
      </div>
    )
  }

  if (!ls) {
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #94a3b8 8%, transparent)", border: "1px solid color-mix(in srgb, #94a3b8 25%, transparent)", color: "#94a3b8" }}>
        <div className="flex items-center gap-1.5"><Wifi className="h-3 w-3" /><span>{host}</span></div>
      </div>
    )
  }

  const [connColor, connLabel] = CONN_STATE_META[ls.live_connection_state] ?? CONN_STATE_META.offline
  const [printColor, printLabel] = PRINT_STATE_META[ls.live_print_state] ?? PRINT_STATE_META.unknown
  const [, providerLabel] = PROVIDER_META[ls.detected_connection_type] ?? PROVIDER_META.unknown
  const remaining = formatRemaining(ls.live_remaining_time_sec)

  return (
    <div className="rounded-lg px-3 py-2 space-y-2" style={{ background: `color-mix(in srgb, ${connColor} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${connColor} 25%, transparent)` }}>
      {/* Header row: host + provider + conn state */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--muted-text)" }}>
          <Wifi className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{host}</span>
          {ls.detected_connection_type !== "unknown" && (
            <span className="font-semibold" style={{ color: connColor }}>{providerLabel}</span>
          )}
        </div>
        <Pill color={connColor} label={connLabel} />
      </div>

      {/* Auth required warning */}
      {ls.live_connection_state === "auth_required" && (
        <p className="text-xs" style={{ color: "#f59e0b" }}>{ls.live_status_message}</p>
      )}

      {/* Print state (only when online) */}
      {ls.live_connection_state === "online" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <Pill color={printColor} label={printLabel} />
            {ls.live_job_name && (
              <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--muted-text)" }} title={ls.live_job_name}>{ls.live_job_name}</span>
            )}
          </div>

          {/* Progress bar */}
          {ls.live_progress_percent != null && ls.live_busy && (
            <div className="space-y-0.5">
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(ls.live_progress_percent, 100)}%`, background: printColor }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: "var(--muted-text)" }}>
                <span>{ls.live_progress_percent.toFixed(1)}%</span>
                {remaining && <span>{remaining}</span>}
              </div>
            </div>
          )}

          {ls.live_status_message && (
            <p className="text-xs" style={{ color: "var(--muted-text)" }}>{ls.live_status_message}</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── LAN Config Fields (reused in OnboardingForm + ConfigDialog) ──────────────

function LanConfigFields({ register }: { register: ReturnType<typeof useForm<StampanteCreate>>["register"] }) {
  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--card-border)", background: "color-mix(in srgb, #3b82f6 4%, transparent)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Connessione LAN</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label>Host / IP</Label>
          <Input placeholder="192.168.1.100" {...register("network_host")} />
        </div>
        <div className="space-y-1">
          <Label>Porta</Label>
          <Input type="number" min="1" max="65535" placeholder="auto" {...register("network_port", { valueAsNumber: true, setValueAs: v => (v === "" || isNaN(v) ? null : Number(v)) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Seriale dispositivo</Label>
          <Input placeholder="Bambu: es. 01P..." {...register("network_serial")} />
        </div>
        <div className="space-y-1">
          <Label>LAN access code</Label>
          <Input placeholder="Bambu: 8 cifre" {...register("lan_access_code")} />
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--muted-text)" }}>Seriale e access code sono necessari per Bambu Lab. Per Klipper/Moonraker bastano host e porta (default 7125).</p>
    </div>
  )
}

// ─── OnboardingForm ──────────────────────────────────────────────────────────

type OnboardingData = Omit<StampanteCreate, "marca" | "modello" | "status" | "active_nozzle_id" | "active_plate_id" | "active_multicolor_ids" | "maintenance_interval_hours" | "last_maintenance_hours">

function OnboardingForm({ onSubmit, isPending }: { onSubmit: (data: StampanteCreate) => void; isPending: boolean }) {
  const [brand, setBrand] = useState("")
  const [series, setSeries] = useState("")
  const [model, setModel] = useState("")
  const { register, handleSubmit } = useForm<OnboardingData>({ defaultValues: { consumo_w: 350, costo_acquisto: 0, ammortamento_orario: 0, diametro_ugello: 0.4, initial_runtime_hours: 0, build_volume_x: 0, build_volume_y: 0, build_volume_z: 0, asset_name: "", network_host: null, network_port: null, network_serial: null, lan_access_code: null } })
  const seriesList = brand ? Object.keys(PRINTER_CATALOG[brand] ?? {}) : []
  const models = series ? PRINTER_CATALOG[brand]?.[series] ?? [] : []
  return (
    <form onSubmit={handleSubmit(data => model && onSubmit({ ...data, marca: brand, modello: model, status: "Idle", active_nozzle_id: null, active_plate_id: null, active_multicolor_ids: [], maintenance_interval_hours: null, last_maintenance_hours: 0 }))} className="space-y-4 mt-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label>Manufacturer</Label><Select value={brand || "__none__"} onValueChange={value => { setBrand(value === "__none__" ? "" : value); setSeries(""); setModel("") }}><SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger><SelectContent><SelectItem value="__none__">Select brand</SelectItem>{Object.keys(PRINTER_CATALOG).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Series</Label><Select value={series || "__none__"} onValueChange={value => { setSeries(value === "__none__" ? "" : value); setModel("") }} disabled={!brand}><SelectTrigger><SelectValue placeholder="Series" /></SelectTrigger><SelectContent><SelectItem value="__none__">Select series</SelectItem>{seriesList.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Model</Label><Select value={model || "__none__"} onValueChange={value => setModel(value === "__none__" ? "" : value)} disabled={!series}><SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger><SelectContent><SelectItem value="__none__">Select model</SelectItem>{models.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-1"><Label>Asset Alias</Label><Input {...register("asset_name")} /></div>
      <div className="grid grid-cols-3 gap-3">{(["build_volume_x", "build_volume_y", "build_volume_z"] as const).map((field, index) => <div key={field} className="space-y-1"><Label>{["Build X", "Build Y", "Build Z"][index]}</Label><Input type="number" min="0" {...register(field, { valueAsNumber: true })} /></div>)}</div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Power (W)</Label><Input type="number" min="0" {...register("consumo_w", { valueAsNumber: true })} /></div><div className="space-y-1"><Label>Nozzle (mm)</Label><Input type="number" step="0.05" min="0" {...register("diametro_ugello", { valueAsNumber: true })} /></div></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Acquisition Cost</Label><Input type="number" step="0.01" min="0" {...register("costo_acquisto", { valueAsNumber: true })} /></div><div className="space-y-1"><Label>Hourly Depreciation</Label><Input type="number" step="0.001" min="0" {...register("ammortamento_orario", { valueAsNumber: true })} /></div></div>
      <div className="space-y-1"><Label>Initial Runtime (h)</Label><Input type="number" step="0.1" min="0" {...register("initial_runtime_hours", { valueAsNumber: true })} /></div>
      <LanConfigFields register={register as unknown as ReturnType<typeof useForm<StampanteCreate>>["register"]} />
      <Button type="submit" disabled={isPending || !model} className="w-full">{isPending ? "Provisioning..." : "Provision Asset"}</Button>
    </form>
  )
}

// ─── ConfigDialog ────────────────────────────────────────────────────────────

function ConfigDialog({ printer, components, onSave, onDelete, isPending }: { printer: Stampante; components: ComponentReplacement[]; onSave: (data: StampanteCreate) => void; onDelete: () => void; isPending: boolean }) {
  const [status, setStatus] = useState<"Idle" | "Printing" | "Maintenance">((printer.status as "Idle" | "Printing" | "Maintenance") ?? "Idle")
  const [nozzleId, setNozzleId] = useState(printer.active_nozzle_id != null ? String(printer.active_nozzle_id) : "__none__")
  const [plateId, setPlateId] = useState(printer.active_plate_id != null ? String(printer.active_plate_id) : "__none__")
  const [multicolorIds, setMulticolorIds] = useState<number[]>(printer.active_multicolor_ids ?? [])
  const { register, handleSubmit } = useForm<Omit<StampanteCreate, "status" | "active_nozzle_id" | "active_plate_id" | "active_multicolor_ids" | "maintenance_interval_hours" | "last_maintenance_hours">>({ defaultValues: { marca: printer.marca, modello: printer.modello, asset_name: printer.asset_name, diametro_ugello: printer.diametro_ugello, consumo_w: printer.consumo_w, costo_acquisto: printer.costo_acquisto, ammortamento_orario: printer.ammortamento_orario, build_volume_x: printer.build_volume_x, build_volume_y: printer.build_volume_y, build_volume_z: printer.build_volume_z, initial_runtime_hours: printer.initial_runtime_hours, network_host: printer.network_host, network_port: printer.network_port, network_serial: printer.network_serial, lan_access_code: printer.lan_access_code } })
  const nozzles = compatibleComponents(printer, components, "nozzle")
  const plates = compatibleComponents(printer, components, "plate")
  const multicolor = compatibleComponents(printer, components, "multicolor")
  return (
    <form onSubmit={handleSubmit(data => onSave({ ...data, diametro_ugello: printer.diametro_ugello, status, active_nozzle_id: nozzleId !== "__none__" ? Number(nozzleId) : null, active_plate_id: plateId !== "__none__" ? Number(plateId) : null, active_multicolor_ids: multicolorIds, maintenance_interval_hours: printer.maintenance_interval_hours, last_maintenance_hours: printer.last_maintenance_hours }))} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Asset Alias</Label><Input {...register("asset_name")} /></div><div className="space-y-1"><Label>Status</Label><Select value={status} onValueChange={value => setStatus(value as "Idle" | "Printing" | "Maintenance")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Idle">Idle</SelectItem><SelectItem value="Printing">Printing</SelectItem><SelectItem value="Maintenance">Maintenance</SelectItem></SelectContent></Select></div></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Manufacturer</Label><Input {...register("marca")} /></div><div className="space-y-1"><Label>Model</Label><Input {...register("modello")} /></div></div>
      <div className="grid grid-cols-3 gap-3">{(["build_volume_x", "build_volume_y", "build_volume_z"] as const).map((field, index) => <div key={field} className="space-y-1"><Label>{["Build X", "Build Y", "Build Z"][index]}</Label><Input type="number" min="0" {...register(field, { valueAsNumber: true })} /></div>)}</div>
      <div className="space-y-1"><Label>Power (W)</Label><Input type="number" min="0" {...register("consumo_w", { valueAsNumber: true })} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Acquisition Cost</Label><Input type="number" step="0.01" min="0" {...register("costo_acquisto", { valueAsNumber: true })} /></div><div className="space-y-1"><Label>Hourly Depreciation</Label><Input type="number" step="0.001" min="0" {...register("ammortamento_orario", { valueAsNumber: true })} /></div></div>
      <div className="space-y-1"><Label>Initial Runtime (h)</Label><Input type="number" step="0.1" min="0" {...register("initial_runtime_hours", { valueAsNumber: true })} /></div>
      <LanConfigFields register={register as unknown as ReturnType<typeof useForm<StampanteCreate>>["register"]} />
      <div className="space-y-1"><Label>Nozzle installato</Label><Select value={nozzleId} onValueChange={setNozzleId}><SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger><SelectContent><SelectItem value="__none__">Nessuno</SelectItem>{nozzles.map(item => <SelectItem key={item.id} value={String(item.id)}>[{item.asset_uid}] {item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Piatto installato</Label><Select value={plateId} onValueChange={setPlateId}><SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger><SelectContent><SelectItem value="__none__">Nessuno</SelectItem>{plates.map(item => <SelectItem key={item.id} value={String(item.id)}>[{item.asset_uid}] {item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Moduli multicolore</Label><div className="space-y-2">{multicolor.length === 0 ? <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--card-border)", color: "var(--muted-text)" }}>Nessun modulo compatibile disponibile.</div> : multicolor.map(item => <label key={item.id} className="flex items-start gap-2 rounded-lg border p-2 cursor-pointer" style={{ borderColor: multicolorIds.includes(item.id) ? "var(--accent)" : "var(--card-border)" }}><input type="checkbox" checked={multicolorIds.includes(item.id)} onChange={() => setMulticolorIds(current => current.includes(item.id) ? current.filter(value => value !== item.id) : [...current, item.id])} /><div><p className="text-sm font-medium" style={{ color: "var(--text)" }}>[{item.asset_uid}] {item.name}</p><p className="text-xs" style={{ color: "var(--muted-text)" }}>stock {item.stock_quantity} - {item.compatibility_multicolor.map(profile => profile.family).join(", ") || item.compatibility_label}</p></div></label>)}</div></div>
      <div className="flex gap-2 pt-1"><Button type="submit" disabled={isPending} className="flex-1">{isPending ? "Saving..." : "Save Configuration"}</Button><ConfirmDialog trigger={<Button type="button" variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>} description={`Decommission ${printer.asset_name || printer.modello}?`} onConfirm={onDelete} /></div>
    </form>
  )
}

// ─── PrinterCard ─────────────────────────────────────────────────────────────

function PrinterCard({ printer, components, onUpdate, onDelete, isPending }: { printer: Stampante; components: ComponentReplacement[]; onUpdate: (data: StampanteCreate) => void; onDelete: () => void; isPending: boolean }) {
  const [open, setOpen] = useState(false)
  const displayName = printer.asset_name || `${printer.marca} ${printer.modello}`

  const { data: liveStatus } = useQuery({
    queryKey: ["printer-live-status", printer.id],
    queryFn: () => api.stampanti.liveStatus(printer.id),
    enabled: !!printer.network_host,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="w-full flex items-center justify-center relative" style={{ height: 154, background: "color-mix(in srgb, var(--accent) 6%, transparent)", borderBottom: "1px solid var(--card-border)" }}>
        <Printer className="h-16 w-16" style={{ color: "color-mix(in srgb, var(--accent) 55%, var(--muted-text))" }} />
        <div className="absolute top-3 right-3"><Pill color={STATUS_COLORS[(printer.status ?? "Idle") as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.Idle} label={printer.status ?? "Idle"} /></div>
      </div>
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div><p className="font-bold text-base leading-tight truncate" style={{ color: "var(--text)" }}>{displayName}</p>{printer.asset_name && <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>{printer.marca} {printer.modello}</p>}</div>

        {/* Live network status */}
        <LiveStatusSection ls={liveStatus ?? null} host={printer.network_host} />

        <div className="rounded-lg px-3 py-2" style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}><div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1" style={{ color: "var(--muted-text)" }}><Clock className="h-3 w-3" /><span className="font-medium uppercase tracking-wider">Accumulated Runtime</span></div><span className="font-bold tabular-nums" style={{ color: "var(--accent)" }}>{printer.accumulated_runtime_hours.toFixed(1)}h</span></div></div>
        <div className="space-y-1 text-xs" style={{ color: "var(--muted-text)" }}>
          {(printer.build_volume_x ?? 0) > 0 && <div className="flex items-center gap-1.5"><Box className="h-3 w-3 flex-shrink-0" /><span>{printer.build_volume_x}x{printer.build_volume_y}x{printer.build_volume_z} mm</span></div>}
          {printer.active_nozzle_uid && <div className="flex items-center gap-1.5"><Cpu className="h-3 w-3 flex-shrink-0" /><span className="truncate">{printer.active_nozzle_uid} - {printer.active_nozzle_name}</span></div>}
          {printer.active_plate_uid && <div className="flex items-center gap-1.5"><Box className="h-3 w-3 flex-shrink-0" /><span className="truncate">{printer.active_plate_uid} - {printer.active_plate_name}</span></div>}
          {printer.active_multicolor_modules.length > 0 && <div className="flex items-center gap-1.5"><Layers3 className="h-3 w-3 flex-shrink-0" /><span className="truncate">{printer.active_multicolor_modules.map(item => item.name).join(", ")}</span></div>}
          <div className="flex items-center gap-1.5"><Zap className="h-3 w-3 flex-shrink-0" /><span>{printer.consumo_w}W - o{printer.diametro_ugello}mm - EUR {printer.ammortamento_orario}/h</span></div>
        </div>
        <div className="mt-auto pt-1">
          <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm" className="w-full gap-2"><Settings className="h-4 w-4" />Configuration</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Asset Configuration - {displayName}</DialogTitle></DialogHeader><ConfigDialog printer={printer} components={components} onSave={data => { onUpdate(data); setOpen(false) }} onDelete={() => { onDelete(); setOpen(false) }} isPending={isPending} /></DialogContent></Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Stampanti() {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const { data: stampanti = [], isLoading } = useQuery({ queryKey: ["stampanti"], queryFn: api.stampanti.list })
  const { data: components = [] } = useQuery({ queryKey: ["component-replacements"], queryFn: api.componentReplacements.list })
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get })
  const createMutation = useMutation({ mutationFn: api.stampanti.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stampanti"] }); setAddOpen(false); toast("Asset provisioned", "success") }, onError: () => toast("Provisioning failed", "error") })
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: StampanteCreate }) => api.stampanti.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stampanti"] }); toast("Configuration saved", "success") }, onError: error => toast(error instanceof Error ? error.message : "Update failed", "error") })
  const deleteMutation = useMutation({ mutationFn: api.stampanti.delete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stampanti"] }); toast("Asset decommissioned", "success") }, onError: () => toast("Decommission failed", "error") })
  const stats = useMemo(() => ({ total: stampanti.length, due: stampanti.filter(item => item.maintenance_status === "due").length, warning: stampanti.filter(item => item.maintenance_status === "warning").length, runtime: stampanti.reduce((sum, item) => sum + item.accumulated_runtime_hours, 0) }), [stampanti])
  if (!settings) return <p className="opacity-50 text-sm">Loading settings...</p>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Printer Fleet</h2><p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>Hardware, manutenzione e componenti installati. Intervallo globale: {settings.maintenance_interval_hours} h</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Provision Asset</Button></DialogTrigger><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Hardware Onboarding</DialogTitle></DialogHeader><OnboardingForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} /></DialogContent></Dialog>
      </div>
      {stampanti.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[{ label: "Total Assets", value: stats.total, icon: Printer }, { label: "Due Maintenance", value: stats.due, icon: AlertTriangle }, { label: "Warnings", value: stats.warning, icon: Wrench }, { label: "Fleet Runtime", value: `${stats.runtime.toFixed(0)}h`, icon: Clock }].map(stat => <div key={stat.label} className="rounded-xl p-3 border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>{stat.label}</p><stat.icon className="h-4 w-4 opacity-50" /></div><p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>{stat.value}</p></div>)}</div>}
      {isLoading ? <p className="opacity-50 text-sm">Loading fleet data...</p> : stampanti.length === 0 ? <div className="rounded-xl border-2 border-dashed p-12 text-center" style={{ borderColor: "var(--card-border)" }}><Printer className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="font-medium" style={{ color: "var(--text)" }}>No assets provisioned</p><p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>Click "Provision Asset" to register your first printer</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{stampanti.map(printer => <PrinterCard key={printer.id} printer={printer} components={components} onUpdate={data => updateMutation.mutate({ id: printer.id, data })} onDelete={() => deleteMutation.mutate(printer.id)} isPending={updateMutation.isPending || deleteMutation.isPending} />)}</div>}
    </div>
  )
}
