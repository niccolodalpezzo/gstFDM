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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Trash2, Plus, Zap } from "lucide-react"
import type { BobinaCreate, BobinaFilamento } from "@/types"

function BobinaForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: BobinaCreate) => void
  isPending: boolean
}) {
  const { register, handleSubmit } = useForm<BobinaCreate>({
    defaultValues: { grammi_residui: 1000, quantita_stock: 1, stato: "Nuova" },
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Marca</Label>
          <Input {...register("marca")} placeholder="es. Bambu Lab" />
        </div>
        <div className="space-y-1">
          <Label>Materiale *</Label>
          <Input {...register("materiale")} required placeholder="es. PETG" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Colore *</Label>
          <Input {...register("colore")} required placeholder="es. Nero" />
        </div>
        <div className="space-y-1">
          <Label>Costo (€/kg) *</Label>
          <Input type="number" step="0.01" min="0" {...register("costo_kg", { valueAsNumber: true })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Grammi per bobina</Label>
          <Input type="number" step="1" min="1" {...register("grammi_residui", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Quantità stock</Label>
          <Input type="number" min="1" {...register("quantita_stock", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Aggiungi"}
      </Button>
    </form>
  )
}

function BobinaCard({
  b,
  onDelete,
  onAttiva,
}: {
  b: BobinaFilamento
  onDelete: (id: number) => void
  onAttiva?: (id: number) => void
}) {
  return (
    <Card>
      <CardContent className="py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">
              {b.marca} {b.materiale} — {b.colore}
            </p>
            {b.codice_univoco && (
              <Badge variant="secondary" className="font-mono text-xs">
                {b.codice_univoco}
              </Badge>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
            €{b.costo_kg}/kg · {b.grammi_residui}g
            {b.stato === "Nuova" && ` · Stock: ${b.quantita_stock}`}
          </p>
        </div>
        <div className="flex gap-1">
          {onAttiva && (
            <Button variant="ghost" size="sm" onClick={() => onAttiva(b.id)}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              Attiva
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            description={`Eliminare bobina ${b.marca} ${b.materiale} (${b.colore})?`}
            onConfirm={() => onDelete(b.id)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Magazzino() {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)

  const { data: bobine = [], isLoading } = useQuery({
    queryKey: ["magazzino"],
    queryFn: api.magazzino.list,
  })

  const nuove = bobine.filter(b => b.stato === "Nuova")
  const usate = bobine.filter(b => b.stato === "Usata")
  const terminate = bobine.filter(b => b.stato === "Terminata")

  const createMutation = useMutation({
    mutationFn: api.magazzino.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      setAddOpen(false)
      toast("Bobina aggiunta", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.magazzino.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      toast("Bobina eliminata", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const attivaMutation = useMutation({
    mutationFn: api.magazzino.attiva,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      toast(`Bobina attivata! Codice: ${data.codice}`, "success")
    },
    onError: () => toast("Errore attivazione", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Magazzino Filamenti
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuova Bobina
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Bobina</DialogTitle>
            </DialogHeader>
            <BobinaForm
              onSubmit={data => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="nuove">
        <TabsList>
          <TabsTrigger value="nuove">
            Nuove ({nuove.length})
          </TabsTrigger>
          <TabsTrigger value="usate">
            Usate ({usate.length})
          </TabsTrigger>
          <TabsTrigger value="terminate">
            Terminate ({terminate.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nuove">
          <div className="space-y-2 mt-3">
            {nuove.length === 0 ? (
              <p className="opacity-50 text-sm">Nessuna bobina nuova in magazzino.</p>
            ) : (
              nuove.map(b => (
                <BobinaCard
                  key={b.id}
                  b={b}
                  onDelete={id => deleteMutation.mutate(id)}
                  onAttiva={id => attivaMutation.mutate(id)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="usate">
          <div className="space-y-2 mt-3">
            {usate.length === 0 ? (
              <p className="opacity-50 text-sm">Nessuna bobina attiva.</p>
            ) : (
              usate.map(b => (
                <BobinaCard
                  key={b.id}
                  b={b}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="terminate">
          <div className="space-y-2 mt-3">
            {terminate.length === 0 ? (
              <p className="opacity-50 text-sm">Nessuna bobina terminata.</p>
            ) : (
              terminate.map(b => (
                <BobinaCard
                  key={b.id}
                  b={b}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
