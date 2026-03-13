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
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Pencil, Trash2, Plus } from "lucide-react"
import { formatEur } from "@/lib/utils"
import type { Progetto, ProgettoCreate } from "@/types"

const STATI = ["Progettazione", "Prototipazione", "Produzione", "Terminato"]

function ProgettoForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<ProgettoCreate>
  onSubmit: (data: ProgettoCreate) => void
  isPending: boolean
}) {
  const { register, handleSubmit, setValue, watch } = useForm<ProgettoCreate>({ defaultValues })
  const statoWatch = watch("stato") ?? defaultValues?.stato ?? "Progettazione"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nome progetto *</Label>
          <Input {...register("nome")} required />
        </div>
        <div className="space-y-1">
          <Label>Cliente</Label>
          <Input {...register("cliente")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Budget vendita (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("budget", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Stato</Label>
          <Select value={statoWatch} onValueChange={v => setValue("stato", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATI.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Quantità</Label>
          <Input type="number" min="1" {...register("quantita_da_produrre", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Ore progettazione</Label>
          <Input type="number" step="0.5" min="0" {...register("ore_progettazione", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Costi extra (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_extra_progetto", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Salva"}
      </Button>
    </form>
  )
}

function statoBadge(stato: string) {
  const map: Record<string, string> = {
    Progettazione: "secondary",
    Prototipazione: "warning",
    Produzione: "default",
    Terminato: "success",
  }
  return <Badge variant={(map[stato] ?? "secondary") as "secondary" | "warning" | "default" | "success"}>{stato}</Badge>
}

export default function Progetti() {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Progetto | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data: progetti = [], isLoading } = useQuery({
    queryKey: ["progetti"],
    queryFn: api.progetti.list,
  })

  const createMutation = useMutation({
    mutationFn: api.progetti.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progetti"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setAddOpen(false)
      toast("Progetto creato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProgettoCreate }) =>
      api.progetti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progetti"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setEditTarget(null)
      toast("Progetto aggiornato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.progetti.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progetti"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast("Progetto eliminato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Gestione Progetti
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuovo Progetto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Progetto</DialogTitle>
            </DialogHeader>
            <ProgettoForm
              defaultValues={{ stato: "Progettazione", quantita_da_produrre: 1, ore_progettazione: 0, budget: 0, costo_extra_progetto: 0 }}
              onSubmit={data => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {progetti.length === 0 ? (
        <p className="opacity-50">Nessun progetto. Creane uno per iniziare.</p>
      ) : (
        <div className="grid gap-3">
          {progetti.map(p => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{p.nome}</p>
                    {statoBadge(p.stato)}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
                    {p.cliente || "–"} · Budget: {formatEur(p.budget)} · Qty: {p.quantita_da_produrre}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editTarget?.id === p.id} onOpenChange={open => !open && setEditTarget(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifica Progetto</DialogTitle>
                      </DialogHeader>
                      {editTarget && (
                        <ProgettoForm
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
                    description={`Eliminare il progetto "${p.nome}"? Saranno eliminati anche tutti i log di stampa associati.`}
                    onConfirm={() => deleteMutation.mutate(p.id)}
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
