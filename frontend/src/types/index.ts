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
  // ammortamento finito (optional per backward compat)
  ammortamento_attivo?: boolean
  ammortamento_residuo_euro?: number | null
  ammortamento_recuperato_euro?: number
  ammortamento_quota_oraria?: number | null
  ammortamento_modalita?: string
  risk_perc_base?: number
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
  snapshot_costo_totale_log?: number | null
  snapshot_data_calcolo?: string | null
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
  costo_orario_manodopera: number
  margine_lordo_default_perc: number
  costo_orario_progettazione_default: number
  criterio_rischio_default: string
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
  // nuovi campi cost_engine (optional per backward compat)
  quota_manutenzione?: number
  quota_overhead?: number
  quota_allocazioni?: number
  quantita_da_produrre?: number
  costo_unitario?: number
  margine_unitario?: number
  has_estimated_logs?: boolean
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
  // nuovi campi cost_engine (optional per backward compat)
  costo_unitario?: number
  margine_unitario?: number
  quota_manutenzione?: number
  has_estimated_logs?: boolean
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
  ordine_visualizzazione: number
  attiva: boolean
  costo_standard_intervento: number
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

// ─── PREVENTIVI ───────────────────────────────────────────────────────────────

export const PREVENTIVO_STATI = ["bozza", "confermato", "annullato", "convertito"] as const
export type PreventivoStato = (typeof PREVENTIVO_STATI)[number]

export interface MaterialConfig {
  id: number
  materiale: string
  marca: string
  scarto_predefinito_perc: number
  energy_multiplier: number
  risk_perc_base: number
  costo_kg: number | null
  note: string
  created_at: string | null
  updated_at: string | null
}

export type MaterialConfigCreate = Omit<MaterialConfig, "id" | "created_at" | "updated_at">

export interface CostoStraordinarioStruttura {
  id: number
  descrizione: string
  importo_totale: number
  importo_residuo: number
  quota_oraria: number
  ore_da_spalmare_totali: number | null
  ore_da_spalmare_residue: number | null
  attivo: boolean
  data: string
  note: string
  created_at: string | null
  updated_at: string | null
}

export type CostoStraordinarioStrutturaCreate = Omit<CostoStraordinarioStruttura, "id" | "created_at" | "updated_at">

export interface PreventivoMaterialeInput {
  magazzino_id: number | null
  materiale_nome: string
  marca: string
  colore: string
  costo_kg: number | null
  grammi_modello: number
  scarto_perc: number | null
  energy_multiplier: number | null
  risk_perc: number | null
}

export interface PreventivoMateriale {
  id: number
  preventivo_id: number
  magazzino_id: number | null
  materiale_nome_snapshot: string
  marca_snapshot: string
  colore_snapshot: string
  costo_kg_snapshot: number
  grammi_modello: number
  scarto_perc: number
  grammi_totali: number
  energy_multiplier_snapshot: number
  risk_perc_snapshot: number
  costo_totale: number
}

export interface PreventivoPostProduzioneInput {
  descrizione: string
  minuti: number | null
  costo_manual: number | null
}

export interface PreventivoPostProduzione {
  id: number
  preventivo_id: number
  descrizione: string
  minuti: number | null
  costo_manual: number | null
  costo_totale: number
}

export interface PreventivoComponenteExtraInput {
  descrizione: string
  quantita: number
  costo_unitario: number
}

export interface PreventivoComponenteExtra {
  id: number
  preventivo_id: number
  descrizione: string
  quantita: number
  costo_unitario: number
  costo_totale: number
}

export interface PreventivoBreakdown {
  costo_materiali: number
  costo_energia: number
  costo_setup: number
  costo_post_produzione: number
  costo_componenti_extra: number
  costo_packing: number
  costo_spedizione: number
  costo_costi_fissi: number
  costo_manutenzione_ordinaria: number
  costo_manutenzione_straordinaria: number
  costo_ammortamento: number
  costo_straordinari_struttura: number
  costo_progettazione: number
  costo_rischio: number
  costo_extra_manual: number
  costo_pieno: number
  prezzo_finale: number
  utile_lordo: number
  margine_lordo_perc: number
  energy_multiplier_eff: number
  rischio_totale_perc: number
  quota_costi_fissi_oraria: number
  quota_manutenzione_ordinaria_oraria: number
  quota_manutenzione_straordinaria_oraria: number
  quota_straordinari_struttura_oraria: number
  quota_ammortamento_oraria: number
  warning: string | null
}

export interface PreventivoInput {
  numero_preventivo?: string | null
  data: string
  cliente_id: number | null
  cliente_nome_snapshot: string
  progetto_nome: string
  stampante_id: number
  stato: PreventivoStato
  quantita: number
  ore_stampa: number
  minuti_setup: number
  costo_progettazione: number
  costo_packing: number
  costo_spedizione: number
  costo_extra_manual: number
  margine_lordo_perc: number
  override_rischio_perc: number | null
  note: string
  materiali: PreventivoMaterialeInput[]
  post_produzione: PreventivoPostProduzioneInput[]
  componenti_extra: PreventivoComponenteExtraInput[]
}

export interface PreventivoListItem {
  id: number
  numero_preventivo: string
  data: string
  cliente_id: number | null
  cliente_nome_snapshot: string
  progetto_nome: string
  stampante_id: number
  stampante_nome_snapshot: string
  stato: PreventivoStato
  quantita: number
  costo_pieno: number
  prezzo_finale: number
  utile_lordo: number
  margine_lordo_perc: number
  updated_at: string | null
}

export interface Preventivo extends PreventivoListItem {
  ore_stampa: number
  minuti_setup: number
  costo_progettazione: number
  costo_packing: number
  costo_spedizione: number
  costo_extra_manual: number
  override_rischio_perc: number | null
  note: string
  snapshot_json: string
  ordine_id: number | null
  materiali: PreventivoMateriale[]
  post_produzione: PreventivoPostProduzione[]
  componenti_extra: PreventivoComponenteExtra[]
  breakdown: PreventivoBreakdown
}

export interface PreventivoPreview {
  breakdown: PreventivoBreakdown
  materiali: PreventivoMateriale[]
  post_produzione: PreventivoPostProduzione[]
  componenti_extra: PreventivoComponenteExtra[]
}

// ─── ORDINI (ERP) ────────────────────────────────────────────────────────────

export const ORDINE_STATI = ["nuovo", "in_lavorazione", "completato", "spedito", "chiuso"] as const
export type OrdineStato = (typeof ORDINE_STATI)[number]

export interface OrdineFile {
  id: number
  ordine_id: number
  file_name: string
  file_size: number
  stampante_id: number | null
  stampante_nome: string | null
  materiale_magazzino_id: number | null
  materiale_nome: string | null
  tempo_stimato_minuti: number
  quantita: number
  note: string
  jobs_count: number
  created_at: string | null
}

export interface OrdineFileUpdate {
  stampante_id: number | null
  materiale_magazzino_id: number | null
  tempo_stimato_minuti: number
  quantita: number
  note: string
}

export interface OrdineListItem {
  id: number
  numero_ordine: string
  preventivo_id: number | null
  cliente_id: number | null
  cliente_nome_snapshot: string
  progetto_nome: string
  stato: OrdineStato
  prezzo_finale: number
  quantita: number
  n_files: number
  n_jobs: number
  n_jobs_completati: number
  data_creazione: string | null
  updated_at: string | null
}

export interface Ordine extends OrdineListItem {
  costo_pieno: number
  utile_lordo: number
  margine_lordo_perc: number
  snapshot_preventivo_json: string
  note: string
  data_completamento: string | null
  data_spedizione: string | null
  data_chiusura: string | null
  files: OrdineFile[]
  jobs: JobLavorazione[]
  spedizioni: Spedizione[]
}

// ─── JOB / LAVORAZIONI ───────────────────────────────────────────────────────

export const JOB_STATI = ["pianificato", "in_corso", "completato", "annullato"] as const
export type JobStato = (typeof JOB_STATI)[number]

export interface JobLavorazione {
  id: number
  numero_job: string
  ordine_id: number
  ordine_file_id: number
  file_name: string | null
  stampante_id: number
  stampante_nome: string | null
  materiale_magazzino_id: number | null
  materiale_nome: string | null
  quantita: number
  tempo_stimato_minuti: number
  tempo_effettivo_minuti: number | null
  grammi_stimati: number
  grammi_effettivi: number | null
  stato: JobStato
  data_inizio: string | null
  data_fine: string | null
  note: string
  ordine_numero: string | null
  created_at: string | null
}

export interface JobCompleteRequest {
  tempo_effettivo_minuti: number
  grammi_effettivi: number
  note: string
}

// ─── SPEDIZIONI ──────────────────────────────────────────────────────────────

export const SPEDIZIONE_STATI = ["preparazione", "spedito", "consegnato", "reso"] as const
export type SpedizioneStato = (typeof SPEDIZIONE_STATI)[number]

export interface Spedizione {
  id: number
  ordine_id: number
  ordine_numero: string | null
  cliente_nome: string | null
  corriere: string
  codice_tracking: string
  costo_spedizione: number
  costo_packing: number
  peso_kg: number
  stato: SpedizioneStato
  data_spedizione: string | null
  data_consegna: string | null
  indirizzo_destinazione: string
  note: string
  created_at: string | null
}

export interface SpedizioneCreate {
  ordine_id: number
  corriere: string
  costo_spedizione: number
  costo_packing: number
  peso_kg: number
  indirizzo_destinazione: string
  note: string
}

// ─── CONFIG CHECK ────────────────────────────────────────────────────────────

export interface ConfigCheckItem {
  key: string
  label: string
  ok: boolean
  value?: string
}

export interface ConfigCheck {
  ready: boolean
  checks: ConfigCheckItem[]
}
