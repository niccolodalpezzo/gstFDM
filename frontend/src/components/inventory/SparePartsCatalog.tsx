import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Boxes, Cpu, Layers3, Package, Plus, Ruler, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import type {
  ComponentCatalogMetadata,
  ComponentMulticolorCompatibility,
  ComponentPartTypeOption,
  ComponentPrinterCompatibility,
  ComponentReplacement,
  ComponentReplacementCreate,
  PrinterCatalogBrand,
} from "@/types"

type FormValues = {
  name: string
  manufacturer: string
  part_number: string
  material: string
  compatibility_label: string
  dimensions: string
  stock_quantity: number
  minimum_stock: number
  unit_cost: number
  nozzle_diameter: number
  bed_size_x: number
  bed_size_y: number
  notes: string
  spalma_costo_farm: boolean
}

function modelKey(brand: string, model: string) {
  return `${brand}::${model}`
}

function modelFromKey(key: string): ComponentPrinterCompatibility {
  const [brand, model] = key.split("::")
  return { brand, model }
}

function PrinterModelMultiSelect({
  catalog,
  selected,
  onChange,
}: {
  catalog: PrinterCatalogBrand[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])

  const selectedLabel = selected.length === 0 ? "Nessun modello" : `${selected.length} modelli`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left"
        style={{ background: "var(--input-bg, transparent)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        <span className={selected.length === 0 ? "opacity-50" : ""}>{selectedLabel}</span>
        <span className="ml-2 opacity-40 text-xs">v</span>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-full rounded-lg border shadow-xl overflow-hidden"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", maxHeight: 260, overflowY: "auto" }}
        >
          {catalog.map(brand => (
            <div key={brand.brand}>
              <div
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", color: "var(--accent)" }}
              >
                {brand.brand}
              </div>
              {brand.series.map(series => (
                <div key={`${brand.brand}-${series.name}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--muted-text)" }}>
                    {series.name}
                  </div>
                  {series.models.map(model => {
                    const value = modelKey(brand.brand, model)
                    const active = selected.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggle(value)}
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-left hover:opacity-80 transition-opacity"
                        style={{ color: "var(--text)" }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 text-xs"
                          style={{
                            borderColor: active ? "var(--accent)" : "var(--border)",
                            background: active ? "var(--accent)" : "transparent",
                            color: "white",
                          }}
                        >
                          {active ? "x" : ""}
                        </span>
                        {model}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function typeCompatibilityMode(partTypes: ComponentPartTypeOption[], typeValue: string) {
  return partTypes.find(item => item.value === typeValue)?.compatibility_mode ?? "none"
}

function selectedMulticolorProfile(
  metadata: ComponentCatalogMetadata | undefined,
  familyKey: string,
): ComponentMulticolorCompatibility | null {
  if (!metadata || !familyKey) return null
  return metadata.multicolor_profiles.find(profile => `${profile.brand}::${profile.family}` === familyKey) ?? null
}

function compatibilityText(item: ComponentReplacement) {
  if (item.compatibility_printers.length > 0) {
    return item.compatibility_printers.map(entry => `${entry.brand} ${entry.model}`).join(", ")
  }
  if (item.compatibility_beds.length > 0) {
    return item.compatibility_beds
      .map(entry => `${entry.size_x}x${entry.size_y} mm (+${entry.tolerance_pct}%)`)
      .join(", ")
  }
  if (item.compatibility_multicolor.length > 0) {
    return item.compatibility_multicolor.map(entry => `${entry.brand} ${entry.family}`).join(", ")
  }
  return item.compatibility_label || "Compatibilita non specificata"
}

function SparePartCard({
  item,
  onDelete,
}: {
  item: ComponentReplacement
  onDelete: (id: number) => void
}) {
  const totalValue = item.stock_quantity * item.unit_cost

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div
          className="w-full h-28 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px dashed var(--card-border)" }}
        >
          <Package className="h-10 w-10 opacity-20" />
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs">{item.asset_uid}</Badge>
              <Badge className="text-xs" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
                {item.tipo_pezzo}
              </Badge>
              {!item.official && (
                <Badge variant="outline" className="text-xs">Community</Badge>
              )}
            </div>
            <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>{item.name}</p>
            {(item.manufacturer || item.part_number) && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                {[item.manufacturer, item.part_number].filter(Boolean).join(" - ")}
              </p>
            )}
          </div>
          <ConfirmDialog
            trigger={<Button variant="ghost" size="icon" className="flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            description={`Eliminare ricambio ${item.asset_uid} - ${item.name}?`}
            onConfirm={() => onDelete(item.id)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2" style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>Stock</p>
            <p className="text-lg font-bold" style={{ color: item.low_stock ? "#f59e0b" : "var(--accent)" }}>{item.stock_quantity}</p>
          </div>
          <div className="rounded-lg p-2" style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>Minimo</p>
            <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{item.minimum_stock}</p>
          </div>
          <div className="rounded-lg p-2" style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid var(--card-border)" }}>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>Valore</p>
            <p className="text-lg font-bold" style={{ color: "var(--text)" }}>EUR {totalValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-1 text-xs" style={{ color: "var(--muted-text)" }}>
          {item.material && (
            <div className="flex items-center gap-1.5">
              <Boxes className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{item.material}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{compatibilityText(item)}</span>
          </div>
          {(item.nozzle_diameter || item.bed_size_x || item.bed_size_y) && (
            <div className="flex items-center gap-1.5">
              <Ruler className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {item.nozzle_diameter ? `Nozzle ${item.nozzle_diameter} mm` : `${item.bed_size_x}x${item.bed_size_y} mm`}
              </span>
            </div>
          )}
          {item.compatibility_multicolor.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.compatibility_multicolor.map(profile => (
                <Badge key={`${profile.brand}-${profile.family}`} variant="outline" className="text-[10px]">
                  {profile.family}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SparePartsCatalog() {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [partType, setPartType] = useState("Nozzle")
  const [selectedPrinterModels, setSelectedPrinterModels] = useState<string[]>([])
  const [selectedMulticolorFamily, setSelectedMulticolorFamily] = useState("")
  const [officialMode, setOfficialMode] = useState("official")

  const { data: metadata } = useQuery({
    queryKey: ["component-replacements-metadata"],
    queryFn: api.componentReplacements.metadata,
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["component-replacements"],
    queryFn: api.componentReplacements.list,
  })

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      manufacturer: "",
      part_number: "",
      material: "",
      compatibility_label: "",
      dimensions: "",
      stock_quantity: 1,
      minimum_stock: 1,
      unit_cost: 0,
      nozzle_diameter: 0.4,
      bed_size_x: 0,
      bed_size_y: 0,
      notes: "",
      spalma_costo_farm: false,
    },
  })

  const compatibilityMode = typeCompatibilityMode(metadata?.part_types ?? [], partType)
  const profile = selectedMulticolorProfile(metadata, selectedMulticolorFamily)

  const createMutation = useMutation({
    mutationFn: (body: ComponentReplacementCreate) => api.componentReplacements.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-replacements"] })
      reset()
      setPartType("Nozzle")
      setSelectedPrinterModels([])
      setSelectedMulticolorFamily("")
      setOfficialMode("official")
      setAddOpen(false)
      toast("Ricambio registrato", "success")
    },
    onError: () => toast("Errore nel salvataggio del ricambio", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.componentReplacements.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-replacements"] })
      toast("Ricambio eliminato", "success")
    },
    onError: () => toast("Errore durante l'eliminazione", "error"),
  })

  const totals = useMemo(() => {
    const stockValue = items.reduce((sum, item) => sum + item.stock_quantity * item.unit_cost, 0)
    const lowStock = items.filter(item => item.low_stock).length
    return { stockValue, lowStock }
  }, [items])

  const submit = (values: FormValues) => {
    const compatibilityPrinters = selectedPrinterModels.map(modelFromKey)
    const compatibilityBeds = compatibilityMode === "bed_area" && values.bed_size_x > 0 && values.bed_size_y > 0
      ? [{
          label: values.compatibility_label || `${values.bed_size_x}x${values.bed_size_y} mm`,
          size_x: values.bed_size_x,
          size_y: values.bed_size_y,
          tolerance_pct: metadata?.bed_tolerance_pct ?? 5,
        }]
      : []
    const compatibilityMulticolor = profile ? [profile] : []

    createMutation.mutate({
      name: values.name,
      manufacturer: values.manufacturer,
      part_number: values.part_number,
      material: values.material,
      tipo_pezzo: partType,
      stampante_ids: [],
      compatibility_label: values.compatibility_label,
      dimensions: values.dimensions,
      installed_date: null,
      stock_quantity: values.stock_quantity,
      minimum_stock: values.minimum_stock,
      unit_cost: values.unit_cost,
      official: profile ? profile.official : officialMode === "official",
      nozzle_diameter: compatibilityMode === "printer_models" && partType === "Nozzle" ? values.nozzle_diameter : null,
      bed_size_x: compatibilityMode === "bed_area" ? values.bed_size_x : null,
      bed_size_y: compatibilityMode === "bed_area" ? values.bed_size_y : null,
      compatibility_printers: compatibilityPrinters,
      compatibility_beds: compatibilityBeds,
      compatibility_multicolor: compatibilityMulticolor,
      notes: values.notes,
      spalma_costo_farm: values.spalma_costo_farm,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Ricambi registrati", value: items.length, accent: "var(--accent)" },
          { label: "Sotto scorta minima", value: totals.lowStock, accent: "#f59e0b" },
          { label: "Valore stock", value: `EUR ${totals.stockValue.toFixed(2)}`, accent: "var(--text)" },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-3 border"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: stat.accent }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-text)" }}>
          Catalogo ricambi con stock e compatibilita per nozzle, piatti e moduli multicolore.
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuovo ricambio</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registra ricambio stampante</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome ricambio *</Label>
                  <Input {...register("name")} required placeholder="es. Hardened nozzle 0.4 mm" />
                </div>
                <div className="space-y-1">
                  <Label>Tipologia *</Label>
                  <Select value={partType} onValueChange={value => {
                    setPartType(value)
                    setSelectedPrinterModels([])
                    setSelectedMulticolorFamily("")
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(metadata?.part_types ?? []).map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Produttore</Label>
                  <Input {...register("manufacturer")} placeholder="es. Bambu Lab" />
                </div>
                <div className="space-y-1">
                  <Label>Part number</Label>
                  <Input {...register("part_number")} placeholder="SKU o codice articolo" />
                </div>
                <div className="space-y-1">
                  <Label>Materiale</Label>
                  <Input {...register("material")} placeholder="es. Acciaio temprato" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Stock disponibile *</Label>
                  <Input type="number" min="0" {...register("stock_quantity", { valueAsNumber: true })} required />
                </div>
                <div className="space-y-1">
                  <Label>Scorta minima *</Label>
                  <Input type="number" min="0" {...register("minimum_stock", { valueAsNumber: true })} required />
                </div>
                <div className="space-y-1">
                  <Label>Costo unitario EUR</Label>
                  <Input type="number" step="0.01" min="0" {...register("unit_cost", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Compatibilita / etichetta</Label>
                  <Input {...register("compatibility_label")} placeholder="es. Serie P1/X1 oppure 256x256 mm" />
                </div>
                <div className="space-y-1">
                  <Label>Dimensioni / note tecniche</Label>
                  <Input {...register("dimensions")} placeholder="es. 0.4 mm, PEI smooth, 4 ingressi" />
                </div>
              </div>

              {compatibilityMode === "printer_models" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Modelli stampante compatibili</Label>
                    <PrinterModelMultiSelect
                      catalog={metadata?.printer_catalog ?? []}
                      selected={selectedPrinterModels}
                      onChange={setSelectedPrinterModels}
                    />
                  </div>
                  {partType === "Nozzle" ? (
                    <div className="space-y-1">
                      <Label>Diametro nozzle (mm)</Label>
                      <Input type="number" min="0" step="0.05" {...register("nozzle_diameter", { valueAsNumber: true })} />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label>Modalita catalogo</Label>
                      <Select value={officialMode} onValueChange={setOfficialMode}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="official">Ufficiale</SelectItem>
                          <SelectItem value="community">Community / aftermarket</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {compatibilityMode === "bed_area" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Area X (mm)</Label>
                    <Input type="number" min="0" {...register("bed_size_x", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Area Y (mm)</Label>
                    <Input type="number" min="0" {...register("bed_size_y", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tolleranza</Label>
                    <div className="h-10 rounded-lg border px-3 flex items-center text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-text)" }}>
                      +{metadata?.bed_tolerance_pct ?? 5}% per asse
                    </div>
                  </div>
                </div>
              )}

              {compatibilityMode === "multicolor" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Profilo multicolore</Label>
                    <Select value={selectedMulticolorFamily || "__none__"} onValueChange={value => setSelectedMulticolorFamily(value === "__none__" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder="Seleziona un profilo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Seleziona un profilo</SelectItem>
                        {(metadata?.multicolor_profiles ?? []).map(profileOption => (
                          <SelectItem
                            key={`${profileOption.brand}::${profileOption.family}`}
                            value={`${profileOption.brand}::${profileOption.family}`}
                          >
                            {profileOption.brand} - {profileOption.family}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Catalogazione</Label>
                    <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--card-border)", background: "color-mix(in srgb, var(--accent) 4%, transparent)" }}>
                      {profile ? (
                        <div className="space-y-1">
                          <p className="font-semibold" style={{ color: "var(--text)" }}>
                            {profile.brand} {profile.family}
                          </p>
                          <p style={{ color: "var(--muted-text)" }}>{profile.notes}</p>
                          <p style={{ color: "var(--muted-text)" }}>
                            Compatibile con: {profile.compatible_models.join(", ")}
                          </p>
                        </div>
                      ) : (
                        <p style={{ color: "var(--muted-text)" }}>Seleziona un profilo per usare i preset iniziali Bambu, Anycubic, Prusa e Klipper/Open.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Note</Label>
                <Input {...register("notes")} placeholder="Fornitore, lotto, adattatori richiesti, note compatibilita" />
              </div>

              <div className="flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: "var(--card-border)", background: "color-mix(in srgb, var(--accent) 4%, transparent)" }}>
                <input
                  type="checkbox"
                  id="spalma_costo_farm"
                  {...register("spalma_costo_farm")}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "var(--accent)" }}
                />
                <div>
                  <Label htmlFor="spalma_costo_farm" className="cursor-pointer font-medium">
                    Spalma il costo nel costo orario farm
                  </Label>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                    Crea un'allocazione: il costo totale (quantita x prezzo unitario) viene ripartito sulle ore lavorative mensili farm.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Salvataggio..." : "Registra ricambio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="opacity-50 text-sm">Caricamento catalogo ricambi...</p>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border-2 border-dashed p-10 text-center"
          style={{ borderColor: "var(--card-border)" }}
        >
          <Layers3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium" style={{ color: "var(--text)" }}>Nessun ricambio registrato</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
            Inizia dal catalogo: stock, costo e compatibilita di nozzle, piatti e moduli multicolore.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <SparePartCard key={item.id} item={item} onDelete={id => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  )
}
