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
import { PROJECT_STATUSES, type Progetto, type ProgettoCreate, type ProjectStatus, type Cliente } from "@/types"

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
  const clienteIdWatch = watch("cliente_id")

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["clienti"],
    queryFn: api.clienti.list,
  })

  function handleClienteChange(value: string) {
    if (value === "__none__") {
      setValue("cliente_id", null)
      setValue("cliente", "")
      return
    }
    const id = Number(value)
    const c = clienti.find(c => c.id === id)
    if (c) {
      setValue("cliente_id", c.id)
      const nome = [c.nome, c.cognome].filter(Boolean).join(" ") || c.azienda || ""
      setValue("cliente", nome)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Nome ordine *</Label>
          <Input {...register("nome")} required />
        </div>
        <div className="space-y-1">
          <Label>Cliente</Label>
          <Select
            value={clienteIdWatch ? String(clienteIdWatch) : "__none__"}
            onValueChange={handleClienteChange}
          >
            <SelectTrigger><SelectValue placeholder="Seleziona cliente..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nessuno —</SelectItem>
              {clienti.map(c => {
                const label = [c.nome, c.cognome].filter(Boolean).join(" ") || c.azienda || `Cliente #${c.id}`
                return <SelectItem key={c.id} value={String(c.id)}>{label}</SelectItem>
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Budget vendita (EUR)</Label>
          <Input type="number" step="0.01" min="0" {...register("budget", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Stato</Label>
          <Select value={statoWatch} onValueChange={value => setValue("stato", value as ProjectStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Quantita</Label>
          <Input type="number" min="1" {...register("quantita_da_produrre", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Ore progettazione</Label>
          <Input type="number" step="0.5" min="0" {...register("ore_progettazione", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Costi extra (EUR)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_extra_progetto", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Salva"}
      </Button>
    </form>
  )
}

function statoBadge(stato: ProjectStatus) {
  const map: Record<ProjectStatus, "secondary" | "warning" | "default" | "success"> = {
    Progettazione: "secondary",
    Prototipazione: "warning",
    Produzione: "default",
    Terminato: "success",
  }

  return <Badge variant={map[stato]}>{stato}</Badge>
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
      toast("Ordine creato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProgettoCreate }) => api.progetti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progetti"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setEditTarget(null)
      toast("Ordine aggiornato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.progetti.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progetti"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast("Ordine eliminato", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  if (isLoading) return <p className="opacity-50">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Ordini
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuovo ordine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo ordine</DialogTitle>
            </DialogHeader>
            <ProgettoForm
              defaultValues={{
                stato: "Progettazione",
                quantita_da_produrre: 1,
                ore_progettazione: 0,
                budget: 0,
                costo_extra_progetto: 0,
              }}
              onSubmit={data => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {progetti.length === 0 ? (
        <p className="opacity-50">Nessun ordine presente. Creane uno per iniziare.</p>
      ) : (
        <div className="grid gap-3">
          {progetti.map(progetto => (
            <Card key={progetto.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{progetto.nome}</p>
                    {statoBadge(progetto.stato)}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
                    {progetto.cliente || "-"} · Budget: {formatEur(progetto.budget)} · Qty: {progetto.quantita_da_produrre}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editTarget?.id === progetto.id} onOpenChange={open => !open && setEditTarget(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(progetto)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifica ordine</DialogTitle>
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
                    trigger={(
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    description={`Eliminare l'ordine "${progetto.nome}"? Anche i log di stampa associati verranno rimossi.`}
                    onConfirm={() => deleteMutation.mutate(progetto.id)}
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
