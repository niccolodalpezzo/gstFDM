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
import { Building2, Pencil, Search, Trash2, Plus, Users } from "lucide-react"
import type { Cliente, ClienteCreate } from "@/types"

function ClienteForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<ClienteCreate>
  onSubmit: (data: ClienteCreate) => void
  isPending: boolean
}) {
  const toast = useToast()
  const { register, handleSubmit } = useForm<ClienteCreate>({ defaultValues })

  const submit = (data: ClienteCreate) => {
    if (data.p_iva && data.p_iva.trim().length !== 11) {
      toast("P.IVA must be exactly 11 characters", "error")
      return
    }
    if (data.sdi && data.sdi.trim().length !== 7) {
      toast("SDI Code must be exactly 7 characters", "error")
      return
    }
    // fiscal code is 16 chars
    if (data.cf && data.cf.trim().length !== 16) {
      toast("Fiscal Code must be exactly 16 characters", "error")
      return
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name *</Label>
          <Input {...register("nome")} required />
        </div>
        <div className="space-y-1">
          <Label>Surname *</Label>
          <Input {...register("cognome")} required />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label>Company Name</Label>
        <Input {...register("azienda")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" {...register("email")} />
        </div>
        <div className="space-y-1">
          <Label>VAT Number (P.IVA)</Label>
          <Input {...register("p_iva")} pattern="\d{11}" title="Must be exactly 11 digits" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>SDI / Codice Destinatario</Label>
          <Input {...register("sdi")} pattern="[A-Z0-9]{7}" title="Must be exactly 7 alphanumeric uppercase characters" />
        </div>
        <div className="space-y-1">
          <Label>Fiscal Code (C.F.)</Label>
          <Input {...register("cf")} pattern="[A-Z0-9]{16}" title="Must be exactly 16 alphanumeric characters" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Address</Label>
        <Input {...register("indirizzo")} />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea {...register("note")} className="h-20" />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Salva cliente"}
      </Button>
    </form>
  )
}

export default function Clienti() {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Cliente | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const { data: clienti = [], isLoading } = useQuery({
    queryKey: ["clienti"],
    queryFn: api.clienti.list,
  })

  const filteredClienti = useMemo(() => {
    return clienti.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.azienda || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.p_iva || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [clienti, searchTerm])
  const businessClients = clienti.filter(cliente => cliente.azienda).length

  const createMutation = useMutation({
    mutationFn: api.clienti.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] })
      setAddOpen(false)
      toast("Cliente creato", "success")
    },
    onError: () => toast("Errore nella creazione cliente", "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteCreate }) =>
      api.clienti.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] })
      setEditTarget(null)
      toast("Cliente aggiornato", "success")
    },
    onError: () => toast("Errore nell'aggiornamento cliente", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: api.clienti.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] })
      queryClient.invalidateQueries({ queryKey: ["progetti"] }) // Projects might relate directly
      toast("Cliente eliminato", "success")
    },
    onError: () => toast("Errore nell'eliminazione cliente", "error"),
  })

  if (isLoading) return <p className="opacity-50">Caricamento...</p>

  return (
    <PageLayout
      title="Clienti"
      description="Anagrafica clienti, dati fiscali e ricerca rapida in ottica CRM operativo."
      actions={(
        <div className="toolbar-surface__group">
          <div className="search-shell">
            <Search className="h-4 w-4" />
            <Input
              type="search"
              placeholder="Cerca cliente..."
              className="w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Nuovo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nuovo cliente</DialogTitle>
              </DialogHeader>
              <ClienteForm
                defaultValues={{ nome: "", cognome: "" }}
                onSubmit={data => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    >
      <div className="stat-grid">
        <StatCard label="Clienti totali" value={clienti.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Aziende censite" value={businessClients} icon={<Building2 className="h-4 w-4" />} color="var(--accent)" />
      </div>

      {filteredClienti.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Nessun cliente trovato"
          description="Affina la ricerca oppure crea un nuovo record cliente."
          action={(
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Nuovo cliente
            </Button>
          )}
        />
      ) : (
        <div className="list-stack">
          {filteredClienti.map(c => (
            <Card key={c.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{c.nome} {c.cognome}</p>
                    {c.azienda && (
                      <span className="text-xs px-2 py-1 rounded-full border" style={{ background: "var(--accent-subtle)", color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                        {c.azienda}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted-text)" }}>
                    {c.email || "No email"} · {c.p_iva ? `P.IVA: ${c.p_iva}` : (c.cf ? `CF: ${c.cf}` : "No VAT/CF")}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Dialog open={editTarget?.id === c.id} onOpenChange={open => !open && setEditTarget(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Modifica cliente</DialogTitle>
                      </DialogHeader>
                      {editTarget && (
                        <ClienteForm
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
                    description={`Eliminare il cliente "${c.nome} ${c.cognome}"? I progetti manterranno il riferimento testuale ma perderanno il collegamento ID.`}
                    onConfirm={() => deleteMutation.mutate(c.id)}
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
