import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  Trash2, Plus, Zap, Settings, MoreVertical,
  Pencil, Clock, Cpu, Ruler, Box, Activity, Scale,
} from "lucide-react"
import type {
  BobinaFilamento, BobinaCreate, BobinaUpdate,
  Stampante, ComponentReplacement, ComponentReplacementCreate,
  GenericAssetCreate, TareOverride, Fornitore,
} from "@/types"
import { FILAMENT_DB, BRAND_NAMES, getMaterialsForBrand } from "@/data/filament-data"

// ─── Effective tare lookup ─────────────────────────────────────────────────────
function getEffectiveTare(marca: string, materiale: string, overrides: TareOverride[]): number {
  const specific = overrides.find(o => o.marca === marca && o.materiale === materiale)
  if (specific) return specific.tare_g
  const brandWide = overrides.find(o => o.marca === marca && o.materiale === "")
  if (brandWide) return brandWide.tare_g
  return FILAMENT_DB[marca]?.defaultTare ?? 0
}

// ─── Color helpers ────────────────────────────────────────────────────────────

/** Returns true if value looks like a hex color */
function isHexColor(v: string) { return /^#[0-9a-fA-F]{3,8}$/.test(v) }

/** Best-effort hex for display: use as-is if already hex, else fallback */
function toDisplayHex(v: string): string {
  return isHexColor(v) ? v : "#888888"
}

function ColorDot({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        background: toDisplayHex(color),
        border: "1px solid rgba(128,128,128,0.35)",
      }}
    />
  )
}

// ─── HSV ↔ Hex utilities ──────────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100; v /= 100
  const k = (n: number) => (n + h / 60) % 6
  const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1))
  return "#" + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, max === 0 ? 0 : (d / max) * 100, max * 100]
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("")
}

// ─── Custom Color Picker Popover ──────────────────────────────────────────────

function ColorPickerPopover({
  hex, onChange,
}: { hex: string; onChange: (v: string) => void }) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(hex))
  const [hexInput, setHexInput] = useState(hex.toUpperCase())
  const svRef  = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const commit = (h: number, s: number, v: number) => {
    const newHex = hsvToHex(h, s, v)
    setHsv([h, s, v])
    setHexInput(newHex.toUpperCase())
    onChange(newHex)
  }

  const makeDrag = (handler: (e: MouseEvent) => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    handler(e.nativeEvent)
    const move = (ev: MouseEvent) => handler(ev)
    const up   = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up) }
    document.addEventListener("mousemove", move)
    document.addEventListener("mouseup",   up)
  }

  const onSvDrag = (e: MouseEvent) => {
    const el = svRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    commit(
      hsv[0],
      Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100)),
      Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100)),
    )
  }

  const onHueDrag = (e: MouseEvent) => {
    const el = hueRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    commit(Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360)), hsv[1], hsv[2])
  }

  const [r, g, b] = hexToRgb(hsvToHex(hsv[0], hsv[1], hsv[2]))

  return (
    <div
      className="absolute z-50 rounded-xl border shadow-2xl select-none"
      style={{ top: 60, left: 0, width: 236, background: "var(--card-bg)", borderColor: "var(--card-border)" }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* ── SV gradient area ── */}
      <div
        ref={svRef}
        className="relative w-full cursor-crosshair rounded-t-xl overflow-hidden"
        style={{ height: 152, background: `hsl(${hsv[0]}, 100%, 50%)` }}
        onMouseDown={makeDrag(onSvDrag)}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
        {/* crosshair cursor */}
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white"
          style={{
            width: 14, height: 14,
            left: `${hsv[1]}%`,
            top:  `${100 - hsv[2]}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      <div className="p-3 space-y-3">
        {/* ── Hue slider ── */}
        <div
          ref={hueRef}
          className="relative h-3 rounded-full cursor-pointer"
          style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
          onMouseDown={makeDrag(onHueDrag)}
        >
          <div
            className="absolute top-1/2 pointer-events-none rounded-full border-2 border-white"
            style={{
              width: 16, height: 16,
              left: `${(hsv[0] / 360) * 100}%`,
              transform: "translate(-50%, -50%)",
              background: `hsl(${hsv[0]}, 100%, 50%)`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* ── Hex input ── */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-8 tracking-widest uppercase" style={{ color: "var(--muted-text)" }}>HEX</span>
          <input
            className="flex-1 text-xs font-mono px-2 py-1.5 rounded-lg border uppercase bg-transparent outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            value={hexInput}
            maxLength={7}
            spellCheck={false}
            onChange={e => {
              const v = e.target.value
              setHexInput(v)
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                const newHsv = hexToHsv(v)
                setHsv(newHsv)
                onChange(v.toLowerCase())
              }
            }}
          />
        </div>

        {/* ── RGB inputs ── */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold w-8 tracking-widest uppercase" style={{ color: "var(--muted-text)" }}>RGB</span>
          {([["R", r, 0], ["G", g, 1], ["B", b, 2]] as [string, number, number][]).map(([lbl, val, idx]) => (
            <div key={lbl} className="flex-1 text-center">
              <input
                type="number" min={0} max={255} value={val}
                className="w-full text-xs font-mono text-center px-1 py-1.5 rounded-lg border bg-transparent outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                onChange={e => {
                  const rgb: [number, number, number] = [r, g, b]
                  rgb[idx] = Math.max(0, Math.min(255, Number(e.target.value)))
                  const newHex = rgbToHex(...rgb)
                  setHsv(hexToHsv(newHex))
                  setHexInput(newHex.toUpperCase())
                  onChange(newHex)
                }}
              />
              <p className="text-center text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Color picker trigger ─────────────────────────────────────────────────────

function FilamentColorPicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const displayHex  = toDisplayHex(value)
  const [open, setOpen] = useState(false)
  const wrapperRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex-shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          width: 52, height: 52,
          background: displayHex,
          border: "2px solid var(--card-border)",
          boxShadow: `0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)`,
          cursor: "pointer",
        }}
      />
      <div className="space-y-0.5">
        <p className="text-sm font-mono font-semibold uppercase" style={{ color: "var(--text)" }}>
          {isHexColor(value) ? value.toUpperCase() : value || "—"}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-text)" }}>Click to open picker</p>
      </div>
      {open && <ColorPickerPopover hex={displayHex} onChange={onChange} />}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

type StatusFilter = "New" | "Active" | "Finished"

function StatusTab({
  value, active, count, onClick,
}: { value: StatusFilter; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
        color: active ? "var(--accent)" : "var(--muted-text)",
        border: active ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" : "1px solid transparent",
      }}
    >
      {value} <span className="ml-1 opacity-70">({count})</span>
    </button>
  )
}

// ─── Spool Edit Dialog ─────────────────────────────────────────────────────────

function SpoolEditDialog({
  spool, open, onClose, fornitori,
}: { spool: BobinaFilamento; open: boolean; onClose: () => void; fornitori: Fornitore[] }) {
  const toast = useToast()
  const [colorSel, setColorSel] = useState(toDisplayHex(spool.colore))
  const { register, handleSubmit, reset, setValue, watch } = useForm<Omit<BobinaUpdate, "colore">>({
    defaultValues: {
      marca: spool.marca,
      materiale: spool.materiale,
      costo_kg: spool.costo_kg,
      grammi_residui: spool.grammi_residui,
      quantita_stock: spool.quantita_stock,
      fornitore_id: spool.fornitore_id,
    },
  })
  
  const selectedFornitoreId = watch("fornitore_id")

  useEffect(() => {
    setColorSel(toDisplayHex(spool.colore))
    reset({
      marca: spool.marca,
      materiale: spool.materiale,
      costo_kg: spool.costo_kg,
      grammi_residui: spool.grammi_residui,
      quantita_stock: spool.quantita_stock,
      fornitore_id: spool.fornitore_id,
    })
  }, [spool, reset])

  const mutation = useMutation({
    mutationFn: (data: BobinaUpdate) => api.magazzino.update(spool.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      toast("Spool updated", "success")
      onClose()
    },
    onError: () => toast("Error updating spool", "error"),
  })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Spool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({ ...d, colore: colorSel }))} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Brand</Label>
              <Input {...register("marca")} placeholder="e.g. Bambu Lab" />
            </div>
            <div className="space-y-1">
              <Label>Material *</Label>
              <Input {...register("materiale")} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color *</Label>
            <FilamentColorPicker value={colorSel} onChange={setColorSel} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Cost (€/kg) *</Label>
              <Input type="number" step="0.01" min="0" {...register("costo_kg", { valueAsNumber: true })} required />
            </div>
            <div className="space-y-1">
              <Label>Weight (g)</Label>
              <Input type="number" step="1" min="0" {...register("grammi_residui", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Stock Qty</Label>
              <Input type="number" min="0" {...register("quantita_stock", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-1 mt-1">
            <Label>Vendor</Label>
            <Select
              value={selectedFornitoreId ? String(selectedFornitoreId) : "none"}
              onValueChange={v => setValue("fornitore_id", v === "none" ? null : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {fornitori.map(f => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.ragione_sociale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── 3-dot context menu ───────────────────────────────────────────────────────

function ActionMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(v => !v)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div
          className="absolute right-0 top-8 z-50 rounded-lg border shadow-xl overflow-hidden w-36"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            onClick={() => { setOpen(false); onEdit() }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Brand/Material dependent select ─────────────────────────────────────────

function BrandMaterialSelect({
  brand, material, onBrandChange, onMaterialChange,
}: {
  brand: string; material: string
  onBrandChange: (v: string) => void
  onMaterialChange: (v: string) => void
}) {
  // brand can be: "" | a key from FILAMENT_DB | "Other" (→ show text input)
  const isKnownBrand = !!FILAMENT_DB[brand]
  const materials    = isKnownBrand ? getMaterialsForBrand(brand) : []

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Brand</Label>
          <Select
            value={brand || "__none__"}
            onValueChange={v => { onBrandChange(v === "__none__" ? "" : v); onMaterialChange("") }}
          >
            <SelectTrigger><SelectValue placeholder="Select brand…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Select brand —</SelectItem>
              {BRAND_NAMES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              <SelectItem value="Other">Other (free text)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Material *</Label>
          {isKnownBrand ? (
            <Select
              value={material || "__none__"}
              onValueChange={v => onMaterialChange(v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select material…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select material —</SelectItem>
                {materials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="e.g. PETG"
              value={material}
              onChange={e => onMaterialChange(e.target.value)}
              required
            />
          )}
        </div>
      </div>

      {brand === "Other" && (
        <div className="space-y-1">
          <Label>Brand Name</Label>
          <Input placeholder="e.g. Fiberlogy" value={brand === "Other" ? "" : brand} onChange={e => onBrandChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}

// ─── Filament Inventory ───────────────────────────────────────────────────────

function FilamentInventory() {
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus]         = useState<StatusFilter>("New")
  const [addOpen, setAddOpen]       = useState(false)
  const [editSpool, setEditSpool]   = useState<BobinaFilamento | null>(null)

  // Brand/material state for Add form
  const [addBrand, setAddBrand]       = useState("")
  const [addMaterial, setAddMaterial] = useState("")
  const [addColorSel, setAddColorSel] = useState("#1a1a1a")

  // Gross weight local inputs (per spool id, only Active tab)
  const [grossInputs, setGrossInputs] = useState<Record<number, string>>({})

  const { data: bobine = [], isLoading } = useQuery({ queryKey: ["magazzino"], queryFn: api.magazzino.list })
  const { data: overrides = [] } = useQuery({ queryKey: ["tare-overrides"], queryFn: api.tareOverrides.list })
  const { data: fornitori = [] } = useQuery({ queryKey: ["fornitori"], queryFn: api.fornitori.list })

  const nuove     = bobine.filter(b => b.stato === "Nuova")
  const usate     = bobine.filter(b => b.stato === "Usata")
  const terminate = bobine.filter(b => b.stato === "Terminata")
  const filtered  = status === "New" ? nuove : status === "Active" ? usate : terminate

  const { register: regAdd, handleSubmit: hsAdd, reset: resetAdd, watch: watchAdd, setValue: setAddValue } = useForm<Omit<BobinaCreate, "colore" | "marca" | "materiale">>({
    defaultValues: { grammi_residui: 1000, quantita_stock: 1, stato: "Nuova", fornitore_id: null },
  })
  
  const addFornitoreId = watchAdd("fornitore_id")

  const createMutation = useMutation({
    mutationFn: api.magazzino.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setAddOpen(false)
      setAddBrand(""); setAddMaterial(""); setAddColorSel("#1a1a1a")
      resetAdd()
      toast("Spool registered", "success")
    },
    onError: () => toast("Error registering spool", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.magazzino.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast("Spool deleted", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const attivaMutation = useMutation({
    mutationFn: api.magazzino.attiva,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast(`Spool activated — UID: ${data.codice}`, "success")
    },
    onError: () => toast("Activation error", "error"),
  })

  const grossWeightMutation = useMutation({
    mutationFn: ({ id, gross_weight, net }: { id: number; gross_weight: number; net: number }) =>
      api.magazzino.updateGrossWeight(id, gross_weight, net),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast("Error updating weight", "error"),
  })

  function saveGrossWeight(b: BobinaFilamento) {
    const raw = grossInputs[b.id]
    if (raw === undefined || raw === "") return
    const gross = Number(raw)
    if (isNaN(gross) || gross < 0) return
    const tare = getEffectiveTare(b.marca, b.materiale, overrides)
    const net  = Math.max(0, gross - tare)
    grossWeightMutation.mutate({ id: b.id, gross_weight: gross, net })
    setGrossInputs(p => { const n = { ...p }; delete n[b.id]; return n })
  }

  // "Other" is just the select sentinel — actual text typed replaces it via onBrandChange
  const resolvedBrand = addBrand === "Other" ? "" : addBrand

  const thCls = "text-left text-xs font-semibold uppercase tracking-wider py-2 px-3"
  const tdCls = "py-2.5 px-3 text-sm"

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {(["New", "Active", "Finished"] as StatusFilter[]).map(s => (
            <StatusTab key={s} value={s} active={status === s}
              count={s === "New" ? nuove.length : s === "Active" ? usate.length : terminate.length}
              onClick={() => setStatus(s)} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setAddBrand(""); setAddMaterial(""); setAddColorSel("#1a1a1a"); resetAdd() } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add New Spool</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register New Spool</DialogTitle></DialogHeader>
              <form
                onSubmit={hsAdd(d => createMutation.mutate({
                  ...d,
                  marca: resolvedBrand,
                  materiale: addMaterial,
                  colore: addColorSel,
                }))}
                className="space-y-3 mt-2"
              >
                <BrandMaterialSelect
                  brand={addBrand} material={addMaterial}
                  onBrandChange={setAddBrand} onMaterialChange={setAddMaterial}
                />
                {/* Tare info */}
                {resolvedBrand && addMaterial && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", color: "var(--muted-text)", border: "1px solid var(--card-border)" }}
                  >
                    <Scale className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                    <span>
                      Empty spool tare:{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {getEffectiveTare(resolvedBrand, addMaterial, overrides)}g
                      </strong>
                      {" "}— overridable in Inventory Settings
                    </span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Color *</Label>
                  <FilamentColorPicker value={addColorSel} onChange={setAddColorSel} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Cost (€/kg) *</Label>
                    <Input type="number" step="0.01" min="0" {...regAdd("costo_kg", { valueAsNumber: true })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Grams / spool</Label>
                    <Input type="number" step="1" min="1" {...regAdd("grammi_residui", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Stock qty</Label>
                    <Input type="number" min="1" {...regAdd("quantita_stock", { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Vendor</Label>
                  <Select
                    value={addFornitoreId ? String(addFornitoreId) : "none"}
                    onValueChange={v => setAddValue("fornitore_id", v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {fornitori.map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.ragione_sociale}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={createMutation.isPending || !addMaterial} className="w-full">
                  {createMutation.isPending ? "Saving..." : "Register Spool"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline" size="sm"
            title="Tare Configuration — Settings"
            onClick={() => navigate("/impostazioni/tare-config")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active tab: tare info banner */}
      {status === "Active" && usate.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", color: "var(--muted-text)", border: "1px solid var(--card-border)" }}
        >
          <Scale className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
          <span>
            Enter the <strong style={{ color: "var(--text)" }}>Gross Weight</strong> from your scale.
            Net Remaining = Gross − Empty Spool Tare. Press <kbd style={{ padding: "0 4px", borderRadius: 3, border: "1px solid var(--border)", color: "var(--text)" }}>Enter</kbd> or click away to save.
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="opacity-50 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="opacity-50 text-sm mt-4">No {status.toLowerCase()} spools in inventory.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
          <table className="w-full">
            <thead style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", borderBottom: "1px solid var(--card-border)" }}>
              <tr>
                {status === "Active" && <th className={thCls} style={{ color: "var(--muted-text)" }}>UID</th>}
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Brand</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Material</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Color</th>
                {status === "New" && <th className={thCls} style={{ color: "var(--muted-text)" }}>Stock Qty</th>}
                {status === "Active" && <th className={thCls} style={{ color: "var(--muted-text)" }}>Gross Weight</th>}
                {status === "Active" && <th className={thCls} style={{ color: "var(--muted-text)" }}>Net Remaining</th>}
                <th className={thCls} style={{ color: "var(--muted-text)" }}>€/kg</th>
                <th className={thCls + " text-right"} style={{ color: "var(--muted-text)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const tare       = getEffectiveTare(b.marca, b.materiale, overrides)
                const rawInput   = grossInputs[b.id]
                const grossVal   = rawInput !== undefined ? rawInput : (b.gross_weight != null ? String(b.gross_weight) : "")
                const grossNum   = grossVal !== "" ? Number(grossVal) : null
                const netDisplay = grossNum !== null ? Math.max(0, grossNum - tare) : b.grammi_residui
                const isLowStock = netDisplay < 200

                return (
                  <tr
                    key={b.id}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--card-border)" : undefined,
                      background: isLowStock && status === "Active"
                        ? "color-mix(in srgb, #ef4444 4%, var(--card-bg))"
                        : "var(--card-bg)",
                    }}
                  >
                    {status === "Active" && (
                      <td className={tdCls}>
                        <Badge variant="secondary" className="font-mono text-xs">{b.codice_univoco ?? "—"}</Badge>
                      </td>
                    )}
                    <td className={tdCls + " font-medium"} style={{ color: "var(--text)" }}>{b.marca || "—"}</td>
                    <td className={tdCls} style={{ color: "var(--text)" }}>{b.materiale}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <ColorDot color={b.colore} size={16} />
                        <span className="text-xs font-mono" style={{ color: "var(--text)" }}>
                          {b.colore.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    {status === "New" && (
                      <td className={tdCls}>
                        <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>×{b.quantita_stock}</span>
                      </td>
                    )}

                    {/* ── Active: Gross Weight input ── */}
                    {status === "Active" && (
                      <td className={tdCls}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0" step="1"
                            placeholder="—"
                            value={grossVal}
                            onChange={e => setGrossInputs(p => ({ ...p, [b.id]: e.target.value }))}
                            onBlur={() => saveGrossWeight(b)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveGrossWeight(b) } }}
                            className="w-20 px-2 py-1.5 rounded-lg border text-sm text-center bg-transparent outline-none tabular-nums"
                            style={{ borderColor: "var(--border)", color: "var(--text)" }}
                          />
                          <span className="text-xs" style={{ color: "var(--muted-text)" }}>g</span>
                        </div>
                        {tare > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                            Tare: {tare}g
                          </p>
                        )}
                      </td>
                    )}

                    {/* ── Active: Net Remaining ── */}
                    {status === "Active" && (
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <div className="w-16 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (netDisplay / 1000) * 100)}%`,
                                background: netDisplay < 200 ? "#ef4444" : netDisplay < 400 ? "#f59e0b" : "#22c55e",
                              }}
                            />
                          </div>
                          <div>
                            <span
                              className="text-xs font-mono tabular-nums font-bold"
                              style={{ color: netDisplay < 200 ? "#ef4444" : netDisplay < 400 ? "#f59e0b" : "var(--text)" }}
                            >
                              {Math.round(netDisplay)}g
                            </span>
                            {isLowStock && (
                              <p className="text-xs" style={{ color: "#ef4444" }}>Low stock</p>
                            )}
                          </div>
                        </div>
                      </td>
                    )}

                    <td className={tdCls + " tabular-nums"} style={{ color: "var(--muted-text)" }}>
                      €{b.costo_kg.toFixed(2)}
                    </td>

                    <td className={tdCls}>
                      <div className="flex items-center justify-end gap-1">
                        {status === "New" && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => attivaMutation.mutate(b.id)}
                              disabled={attivaMutation.isPending}
                            >
                              <Zap className="h-3.5 w-3.5 mr-1" style={{ color: "#f59e0b" }} />
                              Set Active
                            </Button>
                            <ActionMenu onEdit={() => setEditSpool(b)} />
                          </>
                        )}
                        {status === "Active" && (
                          <ActionMenu onEdit={() => setEditSpool(b)} />
                        )}
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                          description={`Delete spool ${b.marca} ${b.materiale} (${b.colore})?`}
                          onConfirm={() => deleteMutation.mutate(b.id)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editSpool && (
        <SpoolEditDialog spool={editSpool} open={!!editSpool} onClose={() => setEditSpool(null)} fornitori={fornitori} />
      )}
    </div>
  )
}

// ─── Component Replacements ───────────────────────────────────────────────────

// ─── Printer multi-select ─────────────────────────────────────────────────────

function PrinterMultiSelect({
  printers, selected, onChange,
}: { printers: Stampante[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  // Group by model
  const groups = printers.reduce<Record<string, Stampante[]>>((acc, p) => {
    ;(acc[p.modello] = acc[p.modello] ?? []).push(p)
    return acc
  }, {})

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const toggleGroup = (ps: Stampante[]) => {
    const ids = ps.map(p => p.id)
    const allOn = ids.every(id => selected.includes(id))
    onChange(allOn ? selected.filter(id => !ids.includes(id)) : [...new Set([...selected, ...ids])])
  }

  const label = selected.length === 0
    ? "None"
    : selected.length === 1
      ? (printers.find(p => p.id === selected[0])?.modello ?? "1 printer")
      : `${selected.length} printers`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left"
        style={{ background: "var(--input-bg, transparent)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        <span className={selected.length === 0 ? "opacity-50" : ""}>{label}</span>
        <span className="ml-2 opacity-40 text-xs">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-full rounded-lg border shadow-xl overflow-hidden"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", maxHeight: 220, overflowY: "auto" }}
        >
          {printers.length === 0 && (
            <p className="px-3 py-2 text-xs opacity-50">No printers registered</p>
          )}
          {Object.entries(groups).map(([model, ps]) => {
            const allOn = ps.every(p => selected.includes(p.id))
            const someOn = ps.some(p => selected.includes(p.id))
            return (
              <div key={model}>
                {/* Model group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(ps)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b text-left hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                    color: allOn || someOn ? "var(--accent)" : "var(--muted-text)",
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 text-xs"
                    style={{
                      borderColor: allOn || someOn ? "var(--accent)" : "var(--border)",
                      background: allOn ? "var(--accent)" : someOn ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "transparent",
                      color: "white",
                    }}
                  >
                    {allOn ? "✓" : someOn ? "−" : ""}
                  </span>
                  {model} series ({ps.length})
                </button>
                {/* Individual printers */}
                {ps.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-left hover:opacity-80 transition-opacity border-b last:border-0"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 text-xs"
                      style={{
                        borderColor: selected.includes(p.id) ? "var(--accent)" : "var(--border)",
                        background: selected.includes(p.id) ? "var(--accent)" : "transparent",
                        color: "white",
                      }}
                    >
                      {selected.includes(p.id) ? "✓" : ""}
                    </span>
                    {p.marca} {p.modello}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Component Card ────────────────────────────────────────────────────────────

function ComponentCard({
  item, onDelete,
}: {
  item: ComponentReplacement
  onDelete: (id: number) => void
}) {
  const printerLabel = item.stampante_modelli.length > 0
    ? item.stampante_modelli.join(", ")
    : item.compatibility_label || null

  const maxHours = 500 // reference MTBF threshold
  const pct = Math.min(100, (item.print_hours_accumulated / maxHours) * 100)
  const wearColor = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e"

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Placeholder image */}
        <div
          className="w-full h-28 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px dashed var(--card-border)" }}
        >
          <Cpu className="h-10 w-10 opacity-20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs">{item.asset_uid}</Badge>
              {item.tipo_pezzo && item.tipo_pezzo !== "Altro" && (
                <Badge className="text-xs" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
                  {item.tipo_pezzo}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>{item.name}</p>
          </div>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" className="flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            description={`Delete component ${item.asset_uid} — ${item.name}?`}
            onConfirm={() => onDelete(item.id)}
          />
        </div>

        {/* Tech specs */}
        <div className="space-y-1 text-xs" style={{ color: "var(--muted-text)" }}>
          {item.material && (
            <div className="flex items-center gap-1.5">
              <Box className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{item.material}</span>
            </div>
          )}
          {printerLabel && (
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{printerLabel}</span>
            </div>
          )}
          {item.dimensions && (
            <div className="flex items-center gap-1.5">
              <Ruler className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{item.dimensions}</span>
            </div>
          )}
          {item.installed_date && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>Installed {item.installed_date}</span>
            </div>
          )}
        </div>

        {/* MTBF tracker */}
        <div
          className="rounded-lg p-2.5 space-y-1.5"
          style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1" style={{ color: "var(--muted-text)" }}>
              <Activity className="h-3 w-3" />
              <span className="font-medium uppercase tracking-wider">Lifecycle</span>
            </div>
            <span className="font-bold tabular-nums" style={{ color: wearColor }}>
              {item.print_hours_accumulated}h / {maxHours}h
            </span>
          </div>
          <div className="rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: wearColor }}
            />
          </div>
          <p className="text-xs text-right" style={{ color: "var(--muted-text)" }}>
            {pct.toFixed(0)}% of estimated MTBF
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

const TIPO_PEZZO_OPTIONS = [
  { value: "Nozzle",               label: "Nozzle" },
  { value: "Piatto PEI Liscio",    label: "Piatto PEI — Liscio" },
  { value: "Piatto PEI Testurizzato", label: "Piatto PEI — Testurizzato" },
  { value: "Piatto PEI Satin",     label: "Piatto PEI — Satin" },
  { value: "Piatto PEI Alta Temp", label: "Piatto PEI — Alta Temp" },
  { value: "AMS",                  label: "AMS" },
  { value: "Altro",                label: "Altro" },
]

function ComponentReplacements() {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [printerSel, setPrinterSel] = useState<number[]>([])
  const [tipoPezzo, setTipoPezzo] = useState("Altro")

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["component-replacements"],
    queryFn: api.componentReplacements.list,
  })

  const { data: printers = [] } = useQuery({
    queryKey: ["stampanti"],
    queryFn: api.stampanti.list,
  })

  const { register, handleSubmit, reset } = useForm<Omit<ComponentReplacementCreate, "stampante_ids" | "tipo_pezzo">>({
    defaultValues: { installed_date: new Date().toISOString().slice(0, 10) },
  })

  const createMutation = useMutation({
    mutationFn: (d: Omit<ComponentReplacementCreate, "stampante_ids" | "tipo_pezzo">) =>
      api.componentReplacements.create({ ...d, stampante_ids: printerSel, tipo_pezzo: tipoPezzo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-replacements"] })
      reset({ installed_date: new Date().toISOString().slice(0, 10) })
      setPrinterSel([])
      setTipoPezzo("Altro")
      setAddOpen(false)
      toast("Component registered", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.componentReplacements.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-replacements"] })
      toast("Component deleted", "success")
    },
    onError: () => toast("Error", "error"),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>
          {items.length} asset{items.length !== 1 ? "s" : ""} tracked
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Register Component</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Replacement Component</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Component Name *</Label>
                <Input {...register("name")} required placeholder="e.g. Hotend E3D V6 0.4mm" />
              </div>
              <div className="space-y-1">
                <Label>Tipologia *</Label>
                <Select value={tipoPezzo} onValueChange={setTipoPezzo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_PEZZO_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Materiale</Label>
                  <Input {...register("material")} placeholder="e.g. Acciaio inox" />
                </div>
                <div className="space-y-1">
                  <Label>Dimensioni</Label>
                  <Input {...register("dimensions")} placeholder="e.g. Ø0.4mm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Stampanti assegnate</Label>
                  <PrinterMultiSelect printers={printers} selected={printerSel} onChange={setPrinterSel} />
                </div>
                <div className="space-y-1">
                  <Label>Data installazione</Label>
                  <Input type="date" {...register("installed_date")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input {...register("notes")} placeholder="Fornitore, numero lotto, ecc." />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Salvataggio..." : "Registra componente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="opacity-50 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="opacity-50 text-sm mt-4">No replacement components registered yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <ComponentCard
              key={item.id}
              item={item}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Generic Assets ───────────────────────────────────────────────────────────

const UNITS = ["pcs", "m", "cm", "kg", "g", "L", "roll", "box", "set"]
const CATEGORIES = ["General", "Fasteners", "Belts & Motion", "Electronics", "Lubricants", "Tools", "Packaging"]

function GenericAssets() {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [catSel, setCatSel] = useState("General")
  const [unitSel, setUnitSel] = useState("pcs")

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["generic-assets"],
    queryFn: api.genericAssets.list,
  })

  const { register, handleSubmit, reset } = useForm<Omit<GenericAssetCreate, "category" | "unit">>()

  const createMutation = useMutation({
    mutationFn: (d: Omit<GenericAssetCreate, "category" | "unit">) =>
      api.genericAssets.create({ ...d, category: catSel, unit: unitSel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic-assets"] })
      reset()
      setCatSel("General")
      setUnitSel("pcs")
      setAddOpen(false)
      toast("Asset registered", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.genericAssets.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic-assets"] })
      toast("Asset deleted", "success")
    },
    onError: () => toast("Error", "error"),
  })

  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)

  const thCls = "text-left text-xs font-semibold uppercase tracking-wider py-2 px-3"
  const tdCls = "py-2.5 px-3 text-sm"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>
          Stock value:{" "}
          <span className="font-bold" style={{ color: "var(--accent)" }}>
            €{totalValue.toFixed(2)}
          </span>
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Generic Asset</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Asset Name *</Label>
                <Input {...register("name")} required placeholder="e.g. M3 brass inserts" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={catSel} onValueChange={setCatSel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Select value={unitSel} onValueChange={setUnitSel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input type="number" step="0.01" min="0" {...register("quantity", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Unit Cost (€)</Label>
                  <Input type="number" step="0.01" min="0" {...register("unit_cost", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input {...register("notes")} placeholder="Supplier, location, etc." />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Saving..." : "Register Asset"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="opacity-50 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="opacity-50 text-sm mt-4">No generic assets registered yet.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
          <table className="w-full">
            <thead style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", borderBottom: "1px solid var(--card-border)" }}>
              <tr>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>UID</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Asset</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Category</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Qty</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Unit Cost</th>
                <th className={thCls} style={{ color: "var(--muted-text)" }}>Total</th>
                <th className={thCls + " text-right"} style={{ color: "var(--muted-text)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--card-border)" : undefined,
                    background: "var(--card-bg)",
                  }}
                >
                  <td className={tdCls}>
                    <Badge variant="secondary" className="font-mono text-xs">{item.asset_uid}</Badge>
                  </td>
                  <td className={tdCls}>
                    <p className="font-medium" style={{ color: "var(--text)" }}>{item.name}</p>
                    {item.notes && <p className="text-xs opacity-60">{item.notes}</p>}
                  </td>
                  <td className={tdCls} style={{ color: "var(--muted-text)" }}>{item.category}</td>
                  <td className={tdCls + " tabular-nums font-medium"} style={{ color: "var(--text)" }}>
                    {item.quantity} <span className="text-xs opacity-60">{item.unit}</span>
                  </td>
                  <td className={tdCls + " tabular-nums"} style={{ color: "var(--muted-text)" }}>
                    €{item.unit_cost.toFixed(2)}
                  </td>
                  <td className={tdCls + " tabular-nums font-bold"} style={{ color: "var(--accent)" }}>
                    €{(item.quantity * item.unit_cost).toFixed(2)}
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end">
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        description={`Delete asset ${item.asset_uid} — ${item.name}?`}
                        onConfirm={() => deleteMutation.mutate(item.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Inventory Management (route-driven) ──────────────────────────────────────

const SECTION_META: Record<string, { label: string; sub: string }> = {
  filament:   { label: "Filament Inventory",     sub: "Spool lifecycle tracking & consumption management" },
  components: { label: "Component Replacements", sub: "Maintenance parts & MTBF lifecycle tracking" },
  assets:     { label: "Generic Assets",         sub: "Miscellaneous stock & consumables register" },
}

export default function InventoryManagement() {
  const { pathname } = useLocation()
  const segment = pathname.split("/").pop() ?? "filament"
  const meta = SECTION_META[segment] ?? SECTION_META["filament"]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{meta.label}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>{meta.sub}</p>
      </div>

      {segment === "filament"   && <FilamentInventory />}
      {segment === "components" && <ComponentReplacements />}
      {segment === "assets"     && <GenericAssets />}
    </div>
  )
}
