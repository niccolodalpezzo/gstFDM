// ─── PROGETTI ─────────────────────────────────────────────────────────────────
export interface Progetto {
  id: number
  nome: string
  cliente: string
  budget: number
  stato: string
  quantita_da_produrre: number
  ore_progettazione: number
  costo_extra_progetto: number
}

export type ProgettoCreate = Omit<Progetto, "id">

// ─── STAMPANTI ────────────────────────────────────────────────────────────────
export interface Stampante {
  id: number
  marca: string
  modello: string
  diametro_ugello: number
  consumo_w: number
  costo_acquisto: number
  ammortamento_orario: number
}

export type StampanteCreate = Omit<Stampante, "id">

// ─── MAGAZZINO ────────────────────────────────────────────────────────────────
export interface BobinaFilamento {
  id: number
  marca: string
  materiale: string
  colore: string
  costo_kg: number
  grammi_residui: number
  stato: "Nuova" | "Usata" | "Terminata"
  quantita_stock: number
  codice_univoco: string | null
}

export type BobinaCreate = Omit<BobinaFilamento, "id" | "codice_univoco">

// ─── COSTI FISSI ──────────────────────────────────────────────────────────────
export interface CostoFisso {
  id: number
  nome: string
  importo_mensile: number
  attivo: boolean
}

export type CostoFissoCreate = Omit<CostoFisso, "id">

// ─── LOG STAMPE ───────────────────────────────────────────────────────────────
export interface LogStampa {
  id: number
  progetto_id: number
  stampante_id: number
  magazzino_id: number
  grammi_usati: number
  tempo_minuti: number
  costo_post_prod: number
  costo_extra: number
  costo_packaging: number
  progetto?: string
  stampante_modello?: string
  materiale?: string
  colore?: string
  codice_univoco?: string
}

export interface LogStampaCreate {
  progetto_id: number
  stampante_id: number
  codice_bobina: string
  grammi_usati: number
  tempo_minuti: number
  costo_post_prod: number
  costo_extra: number
  costo_packaging: number
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export interface Settings {
  costo_kwh: number
  costo_orario_post_prod: number
  ore_lavorative_mensili_farm: number
  theme_mode: "Scuro" | "Chiaro"
  theme_accent: string
  theme_font: string
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  entrate: number
  uscite: number
  margine: number
}

export interface MarginiCalcolati {
  costo_3d: number
  quota_fissi: number
  costi_accessori: number
  costo_progettazione: number
  costo_totale: number
  margine_assoluto: number
  margine_perc: number
  ore_totali: number
}

export interface ProgettoCardData {
  progetto: Progetto
  calcoli: MarginiCalcolati
}
