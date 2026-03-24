import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import type { Settings } from "@/types"

type AziendaFields = Pick<Settings,
  "company_name" | "company_piva" | "company_cf" | "company_indirizzo" |
  "company_cap" | "company_citta" | "company_provincia" |
  "company_telefono" | "company_email" | "company_sito"
>

export default function Azienda() {
  const toast = useToast()
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get })

  const { register, handleSubmit } = useForm<AziendaFields>({
    values: settings ? {
      company_name: settings.company_name,
      company_piva: settings.company_piva,
      company_cf: settings.company_cf,
      company_indirizzo: settings.company_indirizzo,
      company_cap: settings.company_cap,
      company_citta: settings.company_citta,
      company_provincia: settings.company_provincia,
      company_telefono: settings.company_telefono,
      company_email: settings.company_email,
      company_sito: settings.company_sito,
    } : undefined,
  })

  const mutation = useMutation({
    mutationFn: (data: AziendaFields) =>
      settings ? api.settings.update({ ...settings, ...data }) : Promise.reject(new Error("Settings not loaded")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast("Dati azienda salvati", "success")
    },
    onError: () => toast("Errore nel salvataggio", "error"),
  })

  if (!settings) return <p className="opacity-50 text-sm p-6">Caricamento...</p>

  return (
    <PageLayout
      title="Dati Azienda"
      description="Informazioni societarie, sede e contatti dell'azienda."
    >
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-6">

            {/* Identity */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                Identità aziendale
              </p>
              <div className="space-y-1">
                <Label>Nome visualizzato</Label>
                <Input {...register("company_name")} placeholder="es. Arena Plast" />
                <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                  Appare nella barra laterale dell'applicazione
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Partita IVA</Label>
                  <Input {...register("company_piva")} placeholder="12345678901" />
                </div>
                <div className="space-y-1">
                  <Label>Codice Fiscale</Label>
                  <Input {...register("company_cf")} placeholder="RSSMRA80A01H501U" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                Sede legale
              </p>
              <div className="space-y-1">
                <Label>Indirizzo</Label>
                <Input {...register("company_indirizzo")} placeholder="Via Roma 1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>CAP</Label>
                  <Input {...register("company_cap")} placeholder="00100" />
                </div>
                <div className="space-y-1">
                  <Label>Città</Label>
                  <Input {...register("company_citta")} placeholder="Roma" />
                </div>
                <div className="space-y-1">
                  <Label>Provincia</Label>
                  <Input {...register("company_provincia")} placeholder="RM" maxLength={2} className="uppercase" />
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                Contatti
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Telefono</Label>
                  <Input {...register("company_telefono")} type="tel" placeholder="+39 06 12345678" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input {...register("company_email")} type="email" placeholder="info@azienda.it" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Sito web</Label>
                <Input {...register("company_sito")} placeholder="https://www.azienda.it" />
              </div>
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvataggio..." : "Salva dati azienda"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
