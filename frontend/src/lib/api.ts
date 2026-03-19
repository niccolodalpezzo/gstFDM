import type {
  Progetto, ProgettoCreate,
  Stampante, StampanteCreate,
  BobinaFilamento, BobinaCreate, BobinaUpdate,
  CostoFisso, CostoFissoCreate,
  SpesaUnaTantum, SpesaUnaTantumCreate,
  LogStampa, LogStampaCreate,
  Settings,
  DashboardSummary, ProgettoCardData, DashboardAnalytics, ProjectCostItem,
  ComponentReplacement, ComponentReplacementCreate,
  GenericAsset, GenericAssetCreate,
  TareOverride,
  MaterialDensityRatio,
  Cliente, ClienteCreate,
  Fornitore, FornitoreCreate,
} from "@/types"

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8001"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
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
}
