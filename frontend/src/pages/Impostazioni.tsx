import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useEffect } from "react"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { applyTheme } from "@/hooks/useTheme"
import { useToast } from "@/components/ui/toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Settings } from "@/types"

export default function Impostazioni() {
  const toast = useToast()
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })

  const { register, handleSubmit, reset } = useForm<Settings>()

  useEffect(() => {
    if (settings) reset(settings)
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: api.settings.update,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data)
      applyTheme(data)
      toast("Impostazioni salvate", "success")
    },
    onError: () => toast("Errore nel salvataggio", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Impostazioni Setup
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Parametri di costo</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(data => mutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Costo kWh (€)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                {...register("costo_kwh", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Costo orario operatore (€/h)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                {...register("costo_orario_post_prod", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ore lavorative mensili farm</Label>
              <Input
                type="number"
                step="1"
                min="1"
                {...register("ore_lavorative_mensili_farm", { valueAsNumber: true })}
              />
              <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                Usato per ripartire i costi fissi mensili sui singoli progetti
              </p>
            </div>

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Salvataggio..." : "Salva Impostazioni"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
