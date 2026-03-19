import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Trash2 } from "lucide-react"
import { formatEur } from "@/lib/utils"
import type { CostoFissoCreate } from "@/types"

export default function SpeseCorrenti() {
  const toast = useToast()

  const { data: costi = [], isLoading } = useQuery({
    queryKey: ["costi-fissi"],
    queryFn: api.costiFissi.list,
  })

  const { register, handleSubmit, reset } = useForm<CostoFissoCreate>({
    defaultValues: { attivo: true },
  })

  const createMutation = useMutation({
    mutationFn: api.costiFissi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      reset({ attivo: true })
      toast("Expense added", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, attivo }: { id: number; attivo: boolean }) =>
      api.costiFissi.toggle(id, attivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.costiFissi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costi-fissi"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast("Expense deleted", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const totaleAttivo = costi
    .filter(c => c.attivo)
    .reduce((sum, c) => sum + c.importo_mensile, 0)

  if (isLoading) return <p className="opacity-50">Loading...</p>

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Fixed Costs
      </h2>

      {/* Form aggiunta */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(data => createMutation.mutate(data))}
            className="flex gap-3 items-end"
          >
            <div className="flex-1 space-y-1">
              <Label>Description</Label>
              <Input {...register("nome")} required placeholder="e.g. Rent" />
            </div>
            <div className="w-36 space-y-1">
              <Label>Monthly amount (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("importo_mensile", { valueAsNumber: true })}
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista spese */}
      {costi.length === 0 ? (
        <p className="opacity-50">No expenses registered yet.</p>
      ) : (
        <div className="space-y-2">
          {costi.map(c => (
            <Card key={c.id} className={c.attivo ? "" : "opacity-50"}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={c.attivo}
                    onCheckedChange={checked =>
                      toggleMutation.mutate({ id: c.id, attivo: checked })
                    }
                  />
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                      {formatEur(c.importo_mensile)} / month
                    </p>
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  description={`Delete expense "${c.nome}"?`}
                  onConfirm={() => deleteMutation.mutate(c.id)}
                />
              </CardContent>
            </Card>
          ))}

          <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--muted-text)" }}>
              Total active monthly fixed costs
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>
              {formatEur(totaleAttivo)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
