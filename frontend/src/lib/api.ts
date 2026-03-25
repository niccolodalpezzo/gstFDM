import type {
  Progetto, ProgettoCreate,
  Stampante, StampanteCreate, PrinterLiveStatus,
  BobinaFilamento, BobinaCreate, BobinaUpdate,
  CostoFisso, CostoFissoCreate,
  SpesaUnaTantum, SpesaUnaTantumCreate,
  LogStampa, LogStampaCreate,
  Settings,
  DashboardSummary, ProgettoCardData, DashboardAnalytics, ProjectCostItem,
  ComponentCatalogMetadata, ComponentReplacement, ComponentReplacementCreate,
  GenericAsset, GenericAssetCreate,
  TareOverride,
  MaterialDensityRatio,
  Cliente, ClienteCreate,
  Fornitore, FornitoreCreate,
  PianificazioneEvento,
  MaintenanceTemplate, MaintenanceTemplateCreate,
  PrinterMaintenanceStatus,
  ExtraordinaryMaintenance,
  MaterialConfig, MaterialConfigCreate,
  CostoStraordinarioStruttura, CostoStraordinarioStrutturaCreate,
  Preventivo, PreventivoInput, PreventivoListItem, PreventivoPreview,
  Ordine, OrdineListItem, OrdineFile, OrdineFileUpdate,
  JobLavorazione, JobCompleteRequest,
  Spedizione, SpedizioneCreate,
  ConfigCheck,
} from "@/types"
import { translateApiError } from "@/lib/errorTranslation"

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    const raw = new Error(`${res.status}: ${text}`)
    throw new Error(translateApiError(raw))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  dashboard: {
    summary: () => request<DashboardSummary>("/api/dashboard/summary"),
    projects: () => request<ProgettoCardData[]>("/api/dashboard/projects"),
    analytics: (params: Record<string, string | number>) => {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()
      return request<DashboardAnalytics>(`/api/dashboard/analytics?${qs}`)
    },
    projectCosts: () => request<ProjectCostItem[]>("/api/dashboard/project-costs"),
  },

  progetti: {
    list: () => request<Progetto[]>("/api/progetti"),
    create: (body: ProgettoCreate) =>
      request<Progetto>("/api/progetti", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: ProgettoCreate) =>
      request<Progetto>(`/api/progetti/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/progetti/${id}`, { method: "DELETE" }),
    report: async (id: number): Promise<Blob> => {
      const res = await fetch(`${BASE}/api/progetti/${id}/report`)
      if (!res.ok) throw new Error(`${res.status}`)
      return res.blob()
    },
  },

  stampanti: {
    list: () => request<Stampante[]>("/api/stampanti"),
    create: (body: StampanteCreate) =>
      request<Stampante>("/api/stampanti", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: StampanteCreate) =>
      request<Stampante>(`/api/stampanti/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/stampanti/${id}`, { method: "DELETE" }),
    liveStatus: (id: number) =>
      request<PrinterLiveStatus>(`/api/stampanti/${id}/live-status`),
  },

  magazzino: {
    list: () => request<BobinaFilamento[]>("/api/magazzino"),
    create: (body: BobinaCreate) =>
      request<BobinaFilamento>("/api/magazzino", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: BobinaUpdate) =>
      request<BobinaFilamento>(`/api/magazzino/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/magazzino/${id}`, { method: "DELETE" }),
    attiva: (id: number) =>
      request<{ codice: string }>(`/api/magazzino/${id}/attiva`, { method: "POST" }),
    bycodice: (codice: string) =>
      request<BobinaFilamento>(`/api/magazzino/by-codice/${codice}`),
    updateGrossWeight: (id: number, gross_weight: number, grammi_residui: number) =>
      request<BobinaFilamento>(`/api/magazzino/${id}/gross-weight`, {
        method: "PATCH",
        body: JSON.stringify({ gross_weight, grammi_residui }),
      }),
  },

  tareOverrides: {
    list: () => request<TareOverride[]>("/api/tare-overrides"),
    upsert: (body: TareOverride) =>
      request<{ ok: boolean }>("/api/tare-overrides", { method: "PUT", body: JSON.stringify(body) }),
    delete: (marca: string, materiale: string) =>
      request<void>(`/api/tare-overrides/${encodeURIComponent(marca)}/${encodeURIComponent(materiale)}`, { method: "DELETE" }),
  },

  costiFissi: {
    list: () => request<CostoFisso[]>("/api/costi-fissi"),
    create: (body: CostoFissoCreate) =>
      request<CostoFisso>("/api/costi-fissi", { method: "POST", body: JSON.stringify(body) }),
    toggle: (id: number, attivo: boolean) =>
      request<CostoFisso>(`/api/costi-fissi/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ attivo }),
      }),
    delete: (id: number) =>
      request<void>(`/api/costi-fissi/${id}`, { method: "DELETE" }),
  },

  speseUnaTantum: {
    list: () => request<SpesaUnaTantum[]>("/api/spese-una-tantum"),
    create: (body: SpesaUnaTantumCreate) =>
      request<SpesaUnaTantum>("/api/spese-una-tantum", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/spese-una-tantum/${id}`, { method: "DELETE" }),
  },

  logStampe: {
    list: (progetto_id?: number) =>
      request<LogStampa[]>(`/api/log-stampe${progetto_id ? `?progetto_id=${progetto_id}` : ""}`),
    create: (body: LogStampaCreate) =>
      request<LogStampa>("/api/log-stampe", { method: "POST", body: JSON.stringify(body) }),
  },

  componentReplacements: {
    metadata: () => request<ComponentCatalogMetadata>("/api/component-replacements/metadata"),
    list: () => request<ComponentReplacement[]>("/api/component-replacements"),
    create: (body: ComponentReplacementCreate) =>
      request<ComponentReplacement>("/api/component-replacements", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/component-replacements/${id}`, { method: "DELETE" }),
  },

  genericAssets: {
    list: () => request<GenericAsset[]>("/api/generic-assets"),
    create: (body: GenericAssetCreate) =>
      request<GenericAsset>("/api/generic-assets", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/generic-assets/${id}`, { method: "DELETE" }),
  },

  materialDensityRatios: {
    list: () => request<MaterialDensityRatio[]>("/api/material-density-ratios"),
    upsert: (body: MaterialDensityRatio) =>
      request<MaterialDensityRatio>("/api/material-density-ratios", { method: "PUT", body: JSON.stringify(body) }),
    delete: (material: string) =>
      request<void>(`/api/material-density-ratios/${encodeURIComponent(material)}`, { method: "DELETE" }),
  },

  settings: {
    get: () => request<Settings>("/api/settings"),
    update: (body: Settings) =>
      request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  },

  clienti: {
    list: () => request<Cliente[]>("/api/clienti"),
    create: (body: ClienteCreate) =>
      request<Cliente>("/api/clienti", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: ClienteCreate) =>
      request<Cliente>(`/api/clienti/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/clienti/${id}`, { method: "DELETE" }),
  },

  fornitori: {
    list: () => request<Fornitore[]>("/api/fornitori"),
    create: (body: FornitoreCreate) =>
      request<Fornitore>("/api/fornitori", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: FornitoreCreate) =>
      request<Fornitore>(`/api/fornitori/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/fornitori/${id}`, { method: "DELETE" }),
  },

  pianificazione: {
    list: (anno?: number, mese?: number, categoria?: string) => {
      const params = new URLSearchParams()
      if (anno) params.set("anno", String(anno))
      if (mese) params.set("mese", String(mese))
      if (categoria) params.set("categoria", categoria)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return request<PianificazioneEvento[]>(`/api/pianificazione${qs}`)
    },
    get: (id: number) => request<PianificazioneEvento>(`/api/pianificazione/${id}`),
    create: async (data: FormData): Promise<PianificazioneEvento> => {
      const res = await fetch(`${BASE}/api/pianificazione`, { method: "POST", body: data })
      if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
      return res.json()
    },
    update: async (id: number, data: FormData): Promise<PianificazioneEvento> => {
      const res = await fetch(`${BASE}/api/pianificazione/${id}`, { method: "PUT", body: data })
      if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
      return res.json()
    },
    delete: (id: number) => request<void>(`/api/pianificazione/${id}`, { method: "DELETE" }),
    fileUrl: (id: number) => `${BASE}/api/pianificazione/${id}/file`,
  },

  manutenzioni: {
    // Templates
    listTemplates: () => request<MaintenanceTemplate[]>("/api/manutenzioni/templates"),
    createTemplate: (body: MaintenanceTemplateCreate) =>
      request<MaintenanceTemplate>("/api/manutenzioni/templates", { method: "POST", body: JSON.stringify(body) }),
    updateTemplate: (id: number, body: MaintenanceTemplateCreate) =>
      request<MaintenanceTemplate>(`/api/manutenzioni/templates/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteTemplate: (id: number) =>
      request<void>(`/api/manutenzioni/templates/${id}`, { method: "DELETE" }),

    // Printer maintenance status
    listPrinters: () => request<PrinterMaintenanceStatus[]>("/api/manutenzioni/stampanti"),
    getPrinter: (id: number) => request<PrinterMaintenanceStatus>(`/api/manutenzioni/stampanti/${id}`),
    markDone: (printerId: number, templateId: number, accumulated_hours: number, tempo_impiegato_minuti: number, note = "") =>
      request<PrinterMaintenanceStatus>(
        `/api/manutenzioni/stampanti/${printerId}/templates/${templateId}/done`,
        { method: "POST", body: JSON.stringify({ accumulated_hours, tempo_impiegato_minuti, note }) }
      ),

    // Dashboard alerts
    dashboardAlerts: () => request<PrinterMaintenanceStatus[]>("/api/manutenzioni/dashboard-alerts"),

    // Extraordinary maintenance
    listStraordinaria: (printer_id?: number) => {
      const qs = printer_id ? `?printer_id=${printer_id}` : ""
      return request<ExtraordinaryMaintenance[]>(`/api/manutenzioni/straordinaria${qs}`)
    },
    createStraordinaria: (body: {
      printer_id: number
      descrizione_problema: string
      giorni_fermo: number
      componenti: Array<{ descrizione: string; link: string; costo: number }>
      note: string
      ore_print_farm_da_spalmare?: number | null
    }) =>
      request<ExtraordinaryMaintenance>("/api/manutenzioni/straordinaria", { method: "POST", body: JSON.stringify(body) }),
    deleteStraordinaria: (id: number) =>
      request<void>(`/api/manutenzioni/straordinaria/${id}`, { method: "DELETE" }),
  },

  preventivi: {
    list: () => request<PreventivoListItem[]>("/api/preventivi"),
    get: (id: number) => request<Preventivo>(`/api/preventivi/${id}`),
    preview: (body: PreventivoInput) =>
      request<PreventivoPreview>("/api/preventivi/preview", { method: "POST", body: JSON.stringify(body) }),
    create: (body: PreventivoInput) =>
      request<Preventivo>("/api/preventivi", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: PreventivoInput) =>
      request<Preventivo>(`/api/preventivi/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    recalculate: (id: number) =>
      request<Preventivo>(`/api/preventivi/${id}/recalculate`, { method: "POST" }),
    confirm: (id: number) =>
      request<Preventivo>(`/api/preventivi/${id}/confirm`, { method: "POST" }),
    convert: (id: number) =>
      request<Preventivo>(`/api/preventivi/${id}/convert`, { method: "POST" }),
    delete: (id: number) =>
      request<void>(`/api/preventivi/${id}`, { method: "DELETE" }),
    options: {
      materials: () => request<BobinaFilamento[]>("/api/preventivi/options/materials"),
      printers: () => request<Stampante[]>("/api/preventivi/options/printers"),
      clients: () => request<Cliente[]>("/api/preventivi/options/clients"),
    },
    materialConfigs: {
      list: () => request<MaterialConfig[]>("/api/preventivi/config/materiali"),
      upsert: (body: MaterialConfigCreate) =>
        request<MaterialConfig>("/api/preventivi/config/materiali", { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) =>
        request<void>(`/api/preventivi/config/materiali/${id}`, { method: "DELETE" }),
    },
    structureCosts: {
      list: () => request<CostoStraordinarioStruttura[]>("/api/preventivi/costi-struttura"),
      create: (body: CostoStraordinarioStrutturaCreate) =>
        request<CostoStraordinarioStruttura>("/api/preventivi/costi-struttura", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: CostoStraordinarioStrutturaCreate) =>
        request<CostoStraordinarioStruttura>(`/api/preventivi/costi-struttura/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) =>
        request<void>(`/api/preventivi/costi-struttura/${id}`, { method: "DELETE" }),
    },
  },

  // ─── ORDINI ──────────────────────────────────────────────────────────────
  ordini: {
    list: (params?: { stato?: string; cliente_id?: number }) => {
      const qs = new URLSearchParams()
      if (params?.stato) qs.set("stato", params.stato)
      if (params?.cliente_id) qs.set("cliente_id", String(params.cliente_id))
      const q = qs.toString() ? `?${qs.toString()}` : ""
      return request<OrdineListItem[]>(`/api/ordini${q}`)
    },
    get: (id: number) => request<Ordine>(`/api/ordini/${id}`),
    update: (id: number, body: { note?: string }) =>
      request<Ordine>(`/api/ordini/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/api/ordini/${id}`, { method: "DELETE" }),
    transition: (id: number, stato: string) =>
      request<Ordine>(`/api/ordini/${id}/transition`, { method: "POST", body: JSON.stringify({ stato }) }),
    uploadFile: async (ordineId: number, file: File, metadata?: Partial<OrdineFileUpdate>): Promise<Ordine> => {
      const fd = new FormData()
      fd.append("file", file)
      if (metadata?.stampante_id != null) fd.append("stampante_id", String(metadata.stampante_id))
      if (metadata?.materiale_magazzino_id != null) fd.append("materiale_magazzino_id", String(metadata.materiale_magazzino_id))
      if (metadata?.tempo_stimato_minuti != null) fd.append("tempo_stimato_minuti", String(metadata.tempo_stimato_minuti))
      if (metadata?.quantita != null) fd.append("quantita", String(metadata.quantita))
      if (metadata?.note) fd.append("note", metadata.note)
      const res = await fetch(`${BASE}/api/ordini/${ordineId}/files`, { method: "POST", body: fd })
      if (!res.ok) { const t = await res.text(); throw new Error(translateApiError(new Error(`${res.status}: ${t}`))) }
      return res.json()
    },
    updateFile: (ordineId: number, fileId: number, body: OrdineFileUpdate) =>
      request<Ordine>(`/api/ordini/${ordineId}/files/${fileId}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteFile: (ordineId: number, fileId: number) =>
      request<void>(`/api/ordini/${ordineId}/files/${fileId}`, { method: "DELETE" }),
    downloadFileUrl: (ordineId: number, fileId: number) =>
      `${BASE}/api/ordini/${ordineId}/files/${fileId}/download`,
    generateJobs: (ordineId: number, fileId: number) =>
      request<JobLavorazione[]>(`/api/ordini/${ordineId}/files/${fileId}/generate-jobs`, { method: "POST" }),
  },

  // ─── JOB / LAVORAZIONI ──────────────────────────────────────────────────
  jobs: {
    list: (params?: { ordine_id?: number; stampante_id?: number; stato?: string }) => {
      const qs = new URLSearchParams()
      if (params?.ordine_id) qs.set("ordine_id", String(params.ordine_id))
      if (params?.stampante_id) qs.set("stampante_id", String(params.stampante_id))
      if (params?.stato) qs.set("stato", params.stato)
      const q = qs.toString() ? `?${qs.toString()}` : ""
      return request<JobLavorazione[]>(`/api/jobs${q}`)
    },
    get: (id: number) => request<JobLavorazione>(`/api/jobs/${id}`),
    update: (id: number, body: { note?: string }) =>
      request<JobLavorazione>(`/api/jobs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    start: (id: number) =>
      request<JobLavorazione>(`/api/jobs/${id}/start`, { method: "POST" }),
    complete: (id: number, body: JobCompleteRequest) =>
      request<JobLavorazione>(`/api/jobs/${id}/complete`, { method: "POST", body: JSON.stringify(body) }),
    cancel: (id: number) =>
      request<JobLavorazione>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  },

  // ─── SPEDIZIONI ─────────────────────────────────────────────────────────
  spedizioni: {
    list: (ordine_id?: number) => {
      const qs = ordine_id ? `?ordine_id=${ordine_id}` : ""
      return request<Spedizione[]>(`/api/spedizioni${qs}`)
    },
    get: (id: number) => request<Spedizione>(`/api/spedizioni/${id}`),
    create: (body: SpedizioneCreate) =>
      request<Spedizione>("/api/spedizioni", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<SpedizioneCreate> & { codice_tracking?: string }) =>
      request<Spedizione>(`/api/spedizioni/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    ship: (id: number, body: { codice_tracking?: string; corriere?: string }) =>
      request<Spedizione>(`/api/spedizioni/${id}/ship`, { method: "POST", body: JSON.stringify(body) }),
    deliver: (id: number) =>
      request<Spedizione>(`/api/spedizioni/${id}/deliver`, { method: "POST" }),
    delete: (id: number) =>
      request<void>(`/api/spedizioni/${id}`, { method: "DELETE" }),
  },

  // ─── CONFIG CHECK ───────────────────────────────────────────────────────
  configCheck: {
    check: () => request<ConfigCheck>("/api/config-check"),
  },
}
