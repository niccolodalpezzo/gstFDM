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
  cliente_id?: number | null
}

export type ProgettoCreate = Omit<Progetto, "id">

// ─── STAMPANTI ────────────────────────────────────────────────────────────────
export interface Stampante {
  id: number
  marca: string
  modello: string
  asset_name: string
  status: "Idle" | "Printing" | "Maintenance"
  diametro_ugello: number
  consumo_w: number
  costo_acquisto: number
  ammortamento_orario: number
  build_volume_x: number
  build_volume_y: number
  build_volume_z: number
  initial_runtime_hours: number
  active_nozzle_id: number | null
  accumulated_runtime_hours: number
  active_nozzle_name: string | null
  active_nozzle_uid: string | null
}

export type StampanteCreate = Omit<Stampante,
  "id" | "accumulated_runtime_hours" | "active_nozzle_name" | "active_nozzle_uid">

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
  gross_weight: number | null
  fornitore_id?: number | null
  fornitore?: string | null
}

// ─── TARE OVERRIDES ───────────────────────────────────────────────────────────
export interface TareOverride {
  marca: string
  materiale: string
  tare_g: number
}

// ─── MATERIAL DENSITY RATIOS ──────────────────────────────────────────────────
export interface MaterialDensityRatio {
  material: string
  multiplier: number
  notes: string
}

export type BobinaCreate = Omit<BobinaFilamento, "id" | "codice_univoco">

// ─── COSTI FISSI ──────────────────────────────────────────────────────────────
export interface CostoFisso {
  id: number
  nome: string
  importo_mensile: number
  attivo: boolean
  data_inizio: string | null
  frequenza: string
}

export interface CostoFissoCreate {
  nome: string
  importo_mensile: number
  attivo: boolean
  data_inizio: string | null
  frequenza: string
}

// ─── SPESE UNA TANTUM ─────────────────────────────────────────────────────────
export interface SpesaUnaTantum {
  id: number
  descrizione: string
  importo: number
  data: string
  note: string
  fornitore_id?: number | null
  fornitore?: string | null
}

export interface SpesaUnaTantumCreate {
  descrizione: string
  importo: number
  data: string
  note: string
  fornitore_id?: number | null
}

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

export interface ChartItem {
  name: string
  value: number
}

export interface ScortaItem {
  id: number
  nome: string
  materiale: string
  grammi_residui: number
  sotto_soglia: boolean
  soglia: number
}

export interface DashboardAnalytics {
  entrate: number
  uscite: number
  materiali: ChartItem[]
  stampanti: ChartItem[]
  scorte: ScortaItem[]
}

// ─── PROJECT COST ANALYSIS ────────────────────────────────────────────────────
export interface ProjectCostItem {
  id: number
  nome: string
  cliente: string
  stato: string
  budget: number
  costo_materiali: number
  costo_energia: number
  costo_ammortamento: number
  costo_accessori: number
  costo_progettazione: number
  costo_extra_progetto: number
  costo_totale: number
  margine: number
  margine_perc: number
  ore_totali: number
  n_stampe: number
}

// ─── COMPONENT REPLACEMENTS ───────────────────────────────────────────────────
export interface ComponentReplacement {
  id: number
  asset_uid: string
  name: string
  material: string
  tipo_pezzo: string
  stampante_ids: number[]
  stampante_modelli: string[]
  compatibility_label: string
  dimensions: string
  installed_date: string | null
  notes: string
  print_hours_accumulated: number
}

export type ComponentReplacementCreate = Omit<ComponentReplacement,
  "id" | "asset_uid" | "stampante_modelli" | "print_hours_accumulated">

// ─── GENERIC ASSETS ───────────────────────────────────────────────────────────
export interface GenericAsset {
  id: number
  asset_uid: string
  name: string
  category: string
  quantity: number
  unit: string
  unit_cost: number
  notes: string
}

export type GenericAssetCreate = Omit<GenericAsset, "id" | "asset_uid">

// ─── MAGAZZINO UPDATE ─────────────────────────────────────────────────────────
export interface BobinaUpdate {
  marca: string
  materiale: string
  colore: string
  costo_kg: number
  grammi_residui: number
  quantita_stock: number
  fornitore_id?: number | null
}

// ─── MARGINI ──────────────────────────────────────────────────────────────────
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

// ─── CLIENTI E FORNITORI ──────────────────────────────────────────────────────
export interface Cliente {
  id: number
  nome: string
  cognome: string
  azienda: string
  email: string
  p_iva: string
  sdi: string
  cf: string
  indirizzo: string
  note: string
  data_aggiunta: string | null
}

export type ClienteCreate = Omit<Cliente, "id" | "data_aggiunta">

export interface Fornitore {
  id: number
  ragione_sociale: string
  p_iva: string
  sdi: string
  referente: string
  email: string
  telefono: string
  indirizzo: string
  citta: string
  cap: string
  provincia: string
  categoria: string
  note: string
  data_aggiunta: string | null
}

export type FornitoreCreate = Omit<Fornitore, "id" | "data_aggiunta">
