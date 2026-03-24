import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { EmptyState, PageLayout, StatCard } from "@/components/layout/PageLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PackageCheck, Pencil, Search, ShoppingBag, Trash2, Plus } from "lucide-react"
import type { Fornitore, FornitoreCreate } from "@/types"

const CATEGORIES = ["Hardware", "Consumabili", "Manutenzione", "Logistica", "Servizi", "Altro"]

function FornitoreForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<FornitoreCreate>
  onSubmit: (data: FornitoreCreate) => void
  isPending: boolean
}) {
  const toast = useToast()
  const { register, handleSubmit, setValue, watch } = useForm<FornitoreCreate>({ defaultValues })
  const categoryWatch = watch("categoria") ?? defaultValues?.categoria ?? "Hardware"

  const submit = (data: FornitoreCreate) => {
    if (data.p_iva && data.p_iva.trim().length !== 11) {
      toast("P.IVA must be exactly 11 characters", "error")
      return
    }
    if (data.sdi && data.sdi.trim().length !== 7) {
      toast("SDI Code must be exactly 7 characters", "error")
      return
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
      <div className="space-y-1">
        <Label>Ragione Sociale (Company Name) *</Label>
        <Input {...register("ragione_sociale")} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>VAT Number (P.IVA)</Label>
          <Input {...register("p_iva")} pattern="\d{11}" title="Must be exactly 11 digits" />
        </div>
        <div className="space-y-1">
          <Label>SDI</Label>
          <Input {...register("sdi")} pattern="[A-Z0-9]{7}" title="Must be exactly 7 alphanumeric uppercase characters" />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
        <Label className="text-xs uppercase opacity-70">Contact Person</Label>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label>Full Name</Label>
            <Input {...register("referente")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input type="tel" {...register("telefono")} />
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
        <Label className="text-xs uppercase opacity-70">Logistics & Address</Label>
        <div className="space-y-1">
          <Label>Address</Label>
          <Input {...register("indirizzo")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-1">
            <Label>ZIP (CAP)</Label>
            <Input {...register("cap")} />
          </div>
          <div className="space-y-1 col-span-1">
            <Label>City</Label>
            <Input {...register("citta")} />
          </div>
          <div className="space-y-1 col-span-1">
            <Label>Province</Label>
            <Input {...register("provincia")} />
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t mt-2" style={{ borderColor: 'var(--border)' }}>
        <Label className="text-xs uppercase opacity-70">Details</Label>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={categoryWatch} onValueChange={v => setValue("categoria", v)}>
            <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Note fornitore (lead time, accordi)</Label>
          <Textarea {...register("note")} className="h-16" />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full mt-4">
        {isPending ? "Salvataggio..." : "Salva fornitore"}
      </Button>
    </form>
  )
}

export default function Fornitori() {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Fornitore | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const { data: fornitori = [], isLoading } = useQuery({
    queryKey: ["fornitori"],
    queryFn: api.fornitori.list,
  })

  const filteredFornitori = useMemo(() => {
    return fornitori.filter(f => 
      f.ragione_sociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.p_iva || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.categoria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.referente || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [fornitori, searchTerm])
  const categories = new Set(fornitori.map(fornitore => fornitore.categoria).filter(Boolean))

  const createMutation = useMutation({
    mutationFn: api.fornitori.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      setAddOpen(false)
      toast("Fornitore creato", "success")
    },
    onError: () => toast("Errore nella creazione fornitore", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FornitoreCreate }) =>
      api.fornitori.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      setEditTarget(null)
      toast("Fornitore aggiornato", "success")
    },
    onError: () => toast("Errore nell'aggiornamento fornitore", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.fornitori.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      toast("Fornitore eliminato", "success")
    },
    onError: () => toast("Errore nell'eliminazione fornitore", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <PageLayout
      title="Fornitori"
      description="Anagrafiche fornitore, contatti logistici e catalogazione per categoria."
      actions={(
        <div className="toolbar-surface__group">
          <div className="search-shell">
            <Search className="h-4 w-4" />
            <Input
              type="search"
              placeholder="Cerca fornitore..."
              className="w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Nuovo fornitore
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nuovo fornitore</DialogTitle>
              </DialogHeader>
              <FornitoreForm
                defaultValues={{ ragione_sociale: "", categoria: "Hardware" }}
                onSubmit={data => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    >
      <div className="stat-grid">
        <StatCard label="Fornitori totali" value={fornitori.length} icon={<ShoppingBag className="h-4 w-4" />} />
        <StatCard label="Categorie coperte" value={categories.size} icon={<PackageCheck className="h-4 w-4" />} color="var(--accent)" />
      </div>

      {filteredFornitori.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Nessun fornitore trovato"
          description="Aggiorna i filtri oppure aggiungi un nuovo fornitore."
          action={(
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Nuovo fornitore
            </Button>
          )}
        />
      ) : (
        <div className="list-stack">
          {filteredFornitori.map(f => (
            <Card key={f.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{f.ragione_sociale}</p>
                    {f.categoria && (
                      <span className="text-xs px-2 py-1 rounded-full border" style={{ background: "var(--accent-subtle)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                        {f.categoria}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-1">
                    <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                      {f.email || "No email"} {f.telefono ? `· ${f.telefono}` : ""}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                      {f.p_iva ? `P.IVA: ${f.p_iva}` : "No VAT"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editTarget?.id === f.id} onOpenChange={open => !open && setEditTarget(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Modifica fornitore</DialogTitle>
                      </DialogHeader>
                      {editTarget && (
                        <FornitoreForm
                          defaultValues={editTarget}
                          onSubmit={data => updateMutation.mutate({ id: editTarget.id, data })}
                          isPending={updateMutation.isPending}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    description={`Delete vendor "${f.ragione_sociale}"? Financial expenses and inventory will lose ID linking.`}
                    onConfirm={() => deleteMutation.mutate(f.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
