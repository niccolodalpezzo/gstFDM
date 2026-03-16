import type {
  Progetto, ProgettoCreate,
  Stampante, StampanteCreate,
  BobinaFilamento, BobinaCreate,
  CostoFisso, CostoFissoCreate,
  LogStampa, LogStampaCreate,
  Settings,
  DashboardSummary, ProgettoCardData,
} from "@/types"

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000"

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
    delete: (id: number) =>
      request<void>(`/api/magazzino/${id}`, { method: "DELETE" }),
    attiva: (id: number) =>
      request<{ codice: string }>(`/api/magazzino/${id}/attiva`, { method: "POST" }),
    bycodice: (codice: string) =>
      request<BobinaFilamento>(`/api/magazzino/by-codice/${codice}`),
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

  logStampe: {
    list: (progetto_id?: number) =>
      request<LogStampa[]>(`/api/log-stampe${progetto_id ? `?progetto_id=${progetto_id}` : ""}`),
    create: (body: LogStampaCreate) =>
      request<LogStampa>("/api/log-stampe", { method: "POST", body: JSON.stringify(body) }),
  },

  settings: {
    get: () => request<Settings>("/api/settings"),
    update: (body: Settings) =>
      request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
}
