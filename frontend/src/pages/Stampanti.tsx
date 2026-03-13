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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Pencil, Trash2, Plus } from "lucide-react"
import type { Stampante, StampanteCreate } from "@/types"

function StampanteForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<StampanteCreate>
  onSubmit: (data: StampanteCreate) => void
  isPending: boolean
}) {
  const { register, handleSubmit } = useForm<StampanteCreate>({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Marca</Label>
          <Input {...register("marca")} placeholder="es. Bambu Lab" />
        </div>
        <div className="space-y-1">
          <Label>Modello *</Label>
          <Input {...register("modello")} required placeholder="es. X1 Carbon" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Consumo (W) *</Label>
          <Input type="number" step="1" min="0" {...register("consumo_w", { valueAsNumber: true })} required />
        </div>
        <div className="space-y-1">
          <Label>Diametro ugello (mm)</Label>
          <Input type="number" step="0.05" min="0" {...register("diametro_ugello", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Costo acquisto (€)</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_acquisto", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Ammortamento (€/h)</Label>
          <Input type="number" step="0.001" min="0" {...register("ammortamento_orario", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Salva"}
      </Button>
    </form>
  )
}

export default function Stampanti() {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Stampante | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data: stampanti = [], isLoading } = useQuery({
    queryKey: ["stampanti"],
    queryFn: api.stampanti.list,
  })

  const createMutation = useMutation({
    mutationFn: api.stampanti.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stampanti"] })
      setAddOpen(false)
      toast("Stampante aggiunta", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StampanteCreate }) =>
      api.stampanti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stampanti"] })
      setEditTarget(null)
      toast("Stampante aggiornata", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.stampanti.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stampanti"] })
      toast("Stampante eliminata", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Flotta Stampanti
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuova Stampante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Stampante</DialogTitle>
            </DialogHeader>
            <StampanteForm
              defaultValues={{ diametro_ugello: 0.4, consumo_w: 350, costo_acquisto: 0, ammortamento_orario: 0 }}
              onSubmit={data => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {stampanti.length === 0 ? (
        <p className="opacity-50">Nessuna stampante registrata.</p>
      ) : (
        <div className="grid gap-3">
          {stampanti.map(s => (
            <Card key={s.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.marca} {s.modello}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
                    {s.consumo_w}W · ø{s.diametro_ugello}mm · Ammort. €{s.ammortamento_orario}/h
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={editTarget?.id === s.id} onOpenChange={open => !open && setEditTarget(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifica Stampante</DialogTitle>
                      </DialogHeader>
                      {editTarget && (
                        <StampanteForm
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
                    description={`Eliminare ${s.marca} ${s.modello}?`}
                    onConfirm={() => deleteMutation.mutate(s.id)}
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
