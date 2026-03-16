import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { LogStampaCreate } from "@/types"

interface FormData {
  progetto_id: number
  stampante_id: number
  codice_bobina: string
  grammi_usati: number
  tempo_minuti: number
  costo_post_prod: number
  costo_extra: number
  costo_packaging: number
}

export default function PrintLog() {
  const toast = useToast()

  const { data: progetti = [] } = useQuery({ queryKey: ["progetti"], queryFn: api.progetti.list })
  const { data: stampanti = [] } = useQuery({ queryKey: ["stampanti"], queryFn: api.stampanti.list })
  const { data: bobine = [] } = useQuery({ queryKey: ["magazzino"], queryFn: api.magazzino.list })

  const bobineAttive = bobine.filter(b => b.stato === "Usata")

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      grammi_usati: 0,
      tempo_minuti: 0,
      costo_post_prod: 0,
      costo_extra: 0,
      costo_packaging: 0,
    },
  })

  const progettoId = watch("progetto_id")
  const stampanteId = watch("stampante_id")
  const codiceBobina = watch("codice_bobina")

  const logMutation = useMutation({
    mutationFn: (data: LogStampaCreate) => api.logStampe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magazzino"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      reset({
        grammi_usati: 0, tempo_minuti: 0,
        costo_post_prod: 0, costo_extra: 0, costo_packaging: 0,
      })
      toast("Log stampa salvato", "success")
    },
    onError: (err) => toast(`Errore: ${(err as Error).message}`, "error"),
  })

  const onSubmit = (data: FormData) => {
    logMutation.mutate(data as LogStampaCreate)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Print Log & Scansione
      </h2>

      {/* Log Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Stampa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Progetto */}
            <div className="space-y-1">
              <Label>Progetto *</Label>
              <Select
                value={progettoId?.toString()}
                onValueChange={v => setValue("progetto_id", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona progetto" />
                </SelectTrigger>
                <SelectContent>
                  {progetti.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome} ({p.cliente || "–"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stampante */}
            <div className="space-y-1">
              <Label>Stampante *</Label>
              <Select
                value={stampanteId?.toString()}
                onValueChange={v => setValue("stampante_id", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stampante" />
                </SelectTrigger>
                <SelectContent>
                  {stampanti.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.marca} {s.modello}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bobina */}
            <div className="space-y-1">
              <Label>Codice bobina *</Label>
              <Select
                value={codiceBobina}
                onValueChange={v => setValue("codice_bobina", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona bobina attiva" />
                </SelectTrigger>
                <SelectContent>
                  {bobineAttive.map(b => (
                    <SelectItem key={b.id} value={b.codice_univoco!}>
                      [{b.codice_univoco}] {b.marca} {b.materiale} {b.colore} ({b.grammi_residui}g)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tempo e grammi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tempo stampa (minuti) *</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  {...register("tempo_minuti", { valueAsNumber: true })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Grammi usati *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  {...register("grammi_usati", { valueAsNumber: true })}
                  required
                />
              </div>
            </div>

            {/* Costi extra */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Post-prod. (€)</Label>
                <Input type="number" step="0.01" min="0" {...register("costo_post_prod", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Extra (€)</Label>
                <Input type="number" step="0.01" min="0" {...register("costo_extra", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Packaging (€)</Label>
                <Input type="number" step="0.01" min="0" {...register("costo_packaging", { valueAsNumber: true })} />
              </div>
            </div>

            <Button
              type="submit"
              disabled={logMutation.isPending || !progettoId || !stampanteId || !codiceBobina}
              className="w-full"
            >
              {logMutation.isPending ? "Salvataggio..." : "Salva Log Stampa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
