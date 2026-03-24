// ─── PROGETTI ─────────────────────────────────────────────────────────────────
export const PROJECT_STATUSES = [
  "Progettazione",
  "Prototipazione",
  "Produzione",
  "Terminato",
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Progetto {
  id: number
  nome: string
  cliente: string
  budget: number
  stato: ProjectStatus
  quantita_da_produrre: number
  ore_progettazione: number
  costo_extra_progetto: number
  cliente_id?: number | null
}

export type ProgettoCreate = Omit<Progetto, "id">

// ─── STAMPANTI ────────────────────────────────────────────────────────────────

export type PrinterConnectionType = "unknown" | "klipper" | "bambu"
export type PrinterConnectionState = "not_configured" | "online" | "offline" | "error" | "auth_required"
export type PrinterPrintState = "unknown" | "idle" | "printing" | "paused" | "completed" | "error"

export interface PrinterLiveStatus {
  detected_connection_type: PrinterConnectionType
  live_connection_state: PrinterConnectionState
  live_print_state: PrinterPrintState
  live_busy: boolean
  live_progress_percent: number | null
  live_job_name: string | null
  live_remaining_time_sec: number | null
  live_status_message: string | null
  live_last_seen_at: string | null
}

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
  active_plate_id: number | null
  active_multicolor_ids: number[]
  maintenance_interval_hours: number | null
  last_maintenance_hours: number
  // LAN / network
  network_host: string | null
  network_port: number | null
  network_serial: string | null
  lan_access_code: string | null
  // computed
  accumulated_runtime_hours: number
  active_nozzle_name: string | null
  active_nozzle_uid: string | null
  active_plate_name: string | null
  active_plate_uid: string | null
  active_multicolor_modules: Array<{
    id: number
    asset_uid: string
    name: string
    tipo_pezzo: string
  }>
  effective_maintenance_interval_hours: number | null
  next_maintenance_hours: number | null
  maintenance_remaining_hours: number | null
  maintenance_status: "ok" | "warning" | "due"
  live_status: PrinterLiveStatus | null
}

export type StampanteCreate = Omit<Stampante,
  | "id"
  | "accumulated_runtime_hours"
  | "active_nozzle_name"
  | "active_nozzle_uid"
  | "active_plate_name"
  | "active_plate_uid"
  | "active_multicolor_modules"
  | "effective_maintenance_interval_hours"
  | "next_maintenance_hours"
  | "maintenance_remaining_hours"
  | "maintenance_status"
  | "live_status">

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
  maintenance_interval_hours: number
  theme_mode: "Scuro" | "Chiaro"
  theme_accent: string
  theme_font: string
  company_name: string
  company_piva: string
  company_cf: string
  company_indirizzo: string
  company_cap: string
  company_citta: string
  company_provincia: string
  company_telefono: string
  company_email: string
  company_sito: string
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
export interface ComponentPrinterCompatibility {
  brand: string
  model: string
}

export interface ComponentBedCompatibility {
  label: string
  size_x: number
  size_y: number
  tolerance_pct: number
}

export interface ComponentMulticolorCompatibility {
  brand: string
  family: string
  compatible_models: string[]
  official: boolean
  notes: string
}

export interface ComponentReplacement {
  id: number
  asset_uid: string
  name: string
  manufacturer: string
  part_number: string
  material: string
  tipo_pezzo: string
  stampante_ids: number[]
  stampante_modelli: string[]
  compatibility_label: string
  dimensions: string
  installed_date: string | null
  stock_quantity: number
  minimum_stock: number
  unit_cost: number
  official: boolean
  nozzle_diameter: number | null
  bed_size_x: number | null
  bed_size_y: number | null
  compatibility_printers: ComponentPrinterCompatibility[]
  compatibility_beds: ComponentBedCompatibility[]
  compatibility_multicolor: ComponentMulticolorCompatibility[]
  low_stock: boolean
  notes: string
  print_hours_accumulated: number
  spalma_costo_farm: boolean
}

export type ComponentReplacementCreate = Omit<ComponentReplacement,
  "id" | "asset_uid" | "stampante_modelli" | "print_hours_accumulated" | "low_stock">

// ─── FARM HOURLY COST ALLOCATIONS ─────────────────────────────────────────────

export interface FarmHourlyCostAllocation {
  id: number
  source_type: "ordinary_maintenance_labor" | "generic_component"
  source_id: number | null
  descrizione: string
  costo_totale: number
  quota_oraria: number
  ore_iniziali_da_spalmare: number
  ore_residue_da_spalmare: number
  attiva: boolean
  created_at: string | null
}

export interface ComponentPartTypeOption {
  value: string
  label: string
  compatibility_mode: string
}

export interface PrinterCatalogSeries {
  name: string
  models: string[]
}

export interface PrinterCatalogBrand {
  brand: string
  series: PrinterCatalogSeries[]
}

export interface ComponentCatalogMetadata {
  part_types: ComponentPartTypeOption[]
  printer_catalog: PrinterCatalogBrand[]
  multicolor_profiles: ComponentMulticolorCompatibility[]
  bed_tolerance_pct: number
}

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

// ─── PIANIFICAZIONE PRODUZIONE (fase 7) ───────────────────────────────────────
export const EVENTO_STATI = ["Pianificato", "In corso", "Completato", "Annullato"] as const
export type EventoStato = (typeof EVENTO_STATI)[number]

export const EVENTO_CATEGORIE = ["stampe", "manutenzione", "appuntamenti"] as const
export type EventoCategoria = (typeof EVENTO_CATEGORIE)[number]

export interface PianificazioneEvento {
  id: number
  cliente_id: number | null
  progetto_id: number | null
  printer_id: number | null
  titolo: string
  start_at: string        // ISO datetime
  end_at: string | null
  durata_prevista_minuti: number | null
  file_path: string | null
  file_name: string | null
  note: string
  stato: EventoStato
  categoria: EventoCategoria
  created_at: string | null
  cliente_nome: string | null
  progetto_nome: string | null
  printer_nome: string | null
}

// ─── MANUTENZIONI (fase 7-bis) ────────────────────────────────────────────────
export interface MaintenanceTemplate {
  id: number
  nome: string
  descrizione: string
  soglia_ore_massima: number
  ordine: number
  attiva: boolean
}

export type MaintenanceTemplateCreate = Omit<MaintenanceTemplate, "id">

export interface PrinterMaintenanceItem {
  template_id: number
  template_nome: string
  soglia_ore_massima: number
  last_done_runtime_hours: number
  last_done_at: string | null
  note: string
  elapsed_hours: number
  remaining_hours: number
  progress_percent: number
  stato: "ok" | "warning" | "due"
}

export interface PrinterMaintenanceStatus {
  printer_id: number
  printer_nome: string
  accumulated_runtime_hours: number
  items: PrinterMaintenanceItem[]
  worst_stato: "ok" | "warning" | "due"
}

export interface ExtraordinaryComponent {
  descrizione: string
  link: string
  costo: number
}

export interface ExtraordinaryMaintenance {
  id: number
  printer_id: number
  printer_nome: string | null
  descrizione_problema: string
  giorni_fermo: number
  componenti: ExtraordinaryComponent[]
  note: string
  costo_totale: number
  created_at: string | null
  spesa_id: number | null
  // Spalmatura ricambi
  ore_print_farm_da_spalmare: number | null
  quota_oraria_ricambi: number
  ore_residue_da_spalmare: number | null
  spalmatura_attiva: boolean
}
