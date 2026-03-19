import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Pencil, Trash2, Plus, Search } from "lucide-react"
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
          <Label>Vendor Notes (Lead times, agreements)</Label>
          <Textarea {...register("note")} className="h-16" />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md mt-4">
        {isPending ? "Savng..." : "Salva Fornitore"}
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

  const createMutation = useMutation({
    mutationFn: api.fornitori.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      setAddOpen(false)
      toast("Vendor created", "success")
    },
    onError: () => toast("Error creating vendor", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FornitoreCreate }) =>
      api.fornitori.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      setEditTarget(null)
      toast("Vendor updated", "success")
    },
    onError: () => toast("Error updating vendor", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.fornitori.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornitori"] })
      toast("Vendor deleted", "success")
    },
    onError: () => toast("Error deleting vendor", "error"),
  })

  if (isLoading) return <p className="opacity-50">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Vendor Management
        </h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              type="search"
              placeholder="Search vendors..."
              className="pl-9 w-64 rounded-full bg-black/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                <Plus className="h-4 w-4 mr-1" /> Nuovo Fornitore
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Vendor</DialogTitle>
              </DialogHeader>
              <FornitoreForm
                defaultValues={{ ragione_sociale: "", categoria: "Hardware" }}
                onSubmit={data => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredFornitori.length === 0 ? (
        <p className="opacity-50 mt-12 text-center">No vendors found.</p>
      ) : (
        <div className="grid gap-3">
          {filteredFornitori.map(f => (
            <Card key={f.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{f.ragione_sociale}</p>
                    {f.categoria && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                        <DialogTitle>Edit Vendor</DialogTitle>
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
    </div>
  )
}
