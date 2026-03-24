from pydantic import BaseModel, validator
from typing import Optional, List, Literal

ProjectStatus = Literal["Progettazione", "Prototipazione", "Produzione", "Terminato"]
EventoStato = Literal["Pianificato", "In corso", "Completato", "Annullato"]


# ─── CLIENTI ──────────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nome: str
    cognome: str
    azienda: str = ""
    email: str = ""
    p_iva: str = ""
    sdi: str = ""
    cf: str = ""
    indirizzo: str = ""
    note: str = ""


class ClienteOut(ClienteCreate):
    id: int
    data_aggiunta: Optional[str] = None


# ─── FORNITORI ────────────────────────────────────────────────────────────────

class FornitoreCreate(BaseModel):
    ragione_sociale: str
    p_iva: str = ""
    sdi: str = ""
    referente: str = ""
    email: str = ""
    telefono: str = ""
    indirizzo: str = ""
    citta: str = ""
    cap: str = ""
    provincia: str = ""
    categoria: str = ""  # es: Hardware, Consumabili, Manutenzione, Logistica
    note: str = ""


class FornitoreOut(FornitoreCreate):
    id: int
    data_aggiunta: Optional[str] = None


# ─── PROGETTI ─────────────────────────────────────────────────────────────────

class ProgettoCreate(BaseModel):
    nome: str
    cliente: str = ""
    cliente_id: Optional[int] = None
    budget: float = 0.0
    stato: ProjectStatus = "Progettazione"
    quantita_da_produrre: int = 1
    ore_progettazione: float = 0.0
    costo_extra_progetto: float = 0.0


class ProgettoOut(ProgettoCreate):
    id: int


# ─── STAMPANTI ────────────────────────────────────────────────────────────────

class StampanteCreate(BaseModel):
    marca: str = ""
    modello: str
    diametro_ugello: float = 0.4
    consumo_w: float
    costo_acquisto: float
    ammortamento_orario: float
    asset_name: str = ""
    status: str = "Idle"
    build_volume_x: float = 0
    build_volume_y: float = 0
    build_volume_z: float = 0
    initial_runtime_hours: float = 0
    active_nozzle_id: Optional[int] = None
    active_plate_id: Optional[int] = None
    active_multicolor_ids: List[int] = []
    maintenance_interval_hours: Optional[float] = None
    last_maintenance_hours: float = 0.0
    # LAN / network (fase 6)
    network_host: Optional[str] = None
    network_port: Optional[int] = None
    network_serial: Optional[str] = None
    lan_access_code: Optional[str] = None
    # Ammortamento tracking finito
    ammortamento_attivo: Optional[bool] = True
    ammortamento_residuo_euro: Optional[float] = None
    ammortamento_recuperato_euro: Optional[float] = 0.0
    ammortamento_quota_oraria: Optional[float] = None
    ammortamento_modalita: Optional[str] = "manual_hourly_capped"
    risk_perc_base: Optional[float] = 0.0


class InstalledComponentRef(BaseModel):
    id: int
    asset_uid: str
    name: str
    tipo_pezzo: str = "Altro"


class PrinterLiveStatus(BaseModel):
    detected_connection_type: str = "unknown"       # unknown | klipper | bambu
    live_connection_state: str = "not_configured"   # not_configured | online | offline | error | auth_required
    live_print_state: str = "unknown"               # unknown | idle | printing | paused | completed | error
    live_busy: bool = False
    live_progress_percent: Optional[float] = None
    live_job_name: Optional[str] = None
    live_remaining_time_sec: Optional[int] = None
    live_status_message: Optional[str] = None
    live_last_seen_at: Optional[str] = None


class StampanteOut(StampanteCreate):
    id: int
    accumulated_runtime_hours: float = 0.0
    active_nozzle_name: Optional[str] = None
    active_nozzle_uid: Optional[str] = None
    active_plate_name: Optional[str] = None
    active_plate_uid: Optional[str] = None
    active_multicolor_modules: List[InstalledComponentRef] = []
    effective_maintenance_interval_hours: Optional[float] = None
    next_maintenance_hours: Optional[float] = None
    maintenance_remaining_hours: Optional[float] = None
    maintenance_status: str = "ok"
    # Live status (fase 6) — embedded in list response
    live_status: Optional[PrinterLiveStatus] = None


# ─── MAGAZZINO ────────────────────────────────────────────────────────────────

class MagazzinoCreate(BaseModel):
    marca: str = ""
    materiale: str
    colore: str
    costo_kg: float
    grammi_residui: float
    stato: str = "Nuova"
    quantita_stock: int = 1
    fornitore_id: Optional[int] = None


class MagazzinoOut(MagazzinoCreate):
    id: int
    codice_univoco: Optional[str] = None
    gross_weight: Optional[float] = None
    fornitore: Optional[str] = None


class MagazzinoUpdate(BaseModel):
    marca: str = ""
    materiale: str
    colore: str
    costo_kg: float
    grammi_residui: float
    quantita_stock: int = 1


class GrossWeightUpdate(BaseModel):
    gross_weight: float
    grammi_residui: float  # net weight pre-computed by client


# ─── TARE OVERRIDES ───────────────────────────────────────────────────────────

class TareOverride(BaseModel):
    marca: str
    materiale: str = ""
    tare_g: float


# ─── MATERIAL DENSITY RATIOS ──────────────────────────────────────────────────

class MaterialDensityRatio(BaseModel):
    material: str
    multiplier: float = 1.0
    notes: str = ""


# ─── COSTI FISSI ──────────────────────────────────────────────────────────────

class CostoFissoCreate(BaseModel):
    nome: str
    importo_mensile: float
    attivo: bool = True
    data_inizio: Optional[str] = None
    frequenza: str = "Monthly"


class CostoFissoOut(CostoFissoCreate):
    id: int


# ─── SPESE UNA TANTUM ─────────────────────────────────────────────────────────

class SpesaUnaTantumCreate(BaseModel):
    descrizione: str
    importo: float
    data: str
    note: str = ""
    fornitore_id: Optional[int] = None


class SpesaUnaTantumOut(SpesaUnaTantumCreate):
    id: int
    fornitore: Optional[str] = None


# ─── PROJECT COST ANALYSIS ────────────────────────────────────────────────────

class ProjectCostItem(BaseModel):
    id: int
    nome: str
    cliente: str
    stato: str
    budget: float
    costo_materiali: float
    costo_energia: float
    costo_ammortamento: float
    quota_manutenzione: float = 0.0
    quota_overhead: float = 0.0
    quota_allocazioni: float = 0.0
    costo_accessori: float
    costo_progettazione: float
    costo_extra_progetto: float
    costo_totale: float
    margine: float
    margine_perc: float
    ore_totali: float
    n_stampe: int
    quantita_da_produrre: int = 1
    costo_unitario: float = 0.0
    margine_unitario: float = 0.0
    has_estimated_logs: bool = False


# ─── COMPONENT REPLACEMENTS ──────────────────────────────────────────────────

class ComponentPrinterCompatibility(BaseModel):
    brand: str
    model: str


class ComponentBedCompatibility(BaseModel):
    label: str = ""
    size_x: float
    size_y: float
    tolerance_pct: float = 5.0


class ComponentMulticolorCompatibility(BaseModel):
    brand: str
    family: str
    compatible_models: List[str] = []
    official: bool = True
    notes: str = ""


class ComponentReplacementCreate(BaseModel):
    name: str
    manufacturer: str = ""
    part_number: str = ""
    material: str = ""
    tipo_pezzo: str = "Altro"
    stampante_ids: List[int] = []
    compatibility_label: str = ""
    dimensions: str = ""
    installed_date: Optional[str] = None
    stock_quantity: int = 0
    minimum_stock: int = 0
    unit_cost: float = 0.0
    official: bool = True
    nozzle_diameter: Optional[float] = None
    bed_size_x: Optional[float] = None
    bed_size_y: Optional[float] = None
    compatibility_printers: List[ComponentPrinterCompatibility] = []
    compatibility_beds: List[ComponentBedCompatibility] = []
    compatibility_multicolor: List[ComponentMulticolorCompatibility] = []
    notes: str = ""
    spalma_costo_farm: bool = False


class ComponentReplacementOut(BaseModel):
    id: int
    asset_uid: str
    name: str
    manufacturer: str = ""
    part_number: str = ""
    material: str = ""
    tipo_pezzo: str = "Altro"
    stampante_ids: List[int] = []
    stampante_modelli: List[str] = []
    compatibility_label: str = ""
    dimensions: str = ""
    installed_date: Optional[str] = None
    stock_quantity: int = 0
    minimum_stock: int = 0
    unit_cost: float = 0.0
    official: bool = True
    nozzle_diameter: Optional[float] = None
    bed_size_x: Optional[float] = None
    bed_size_y: Optional[float] = None
    compatibility_printers: List[ComponentPrinterCompatibility] = []
    compatibility_beds: List[ComponentBedCompatibility] = []
    compatibility_multicolor: List[ComponentMulticolorCompatibility] = []
    low_stock: bool = False
    notes: str = ""
    print_hours_accumulated: float = 0.0
    spalma_costo_farm: bool = False


# ─── FARM HOURLY COST ALLOCATIONS ────────────────────────────────────────────

class FarmHourlyCostAllocationOut(BaseModel):
    id: int
    source_type: str
    source_id: Optional[int] = None
    descrizione: str = ""
    costo_totale: float = 0.0
    quota_oraria: float = 0.0
    ore_iniziali_da_spalmare: float = 0.0
    ore_residue_da_spalmare: float = 0.0
    attiva: bool = True
    created_at: Optional[str] = None


# ─── GENERIC ASSETS ───────────────────────────────────────────────────────────

class GenericAssetCreate(BaseModel):
    name: str
    category: str = "General"
    quantity: float = 0.0
    unit: str = "pcs"
    unit_cost: float = 0.0
    notes: str = ""


class GenericAssetOut(GenericAssetCreate):
    id: int
    asset_uid: str


# ─── LOG STAMPE ───────────────────────────────────────────────────────────────

class LogStampaCreate(BaseModel):
    progetto_id: int
    stampante_id: int
    codice_bobina: str  # codice univoco 4 caratteri della bobina attiva
    grammi_usati: float
    tempo_minuti: float
    costo_post_prod: float = 0.0
    costo_extra: float = 0.0
    costo_packaging: float = 0.0
    data: Optional[str] = None  # yyyy-mm-dd, default oggi


class LogStampaOut(BaseModel):
    id: int
    progetto_id: int
    stampante_id: int
    magazzino_id: int
    grammi_usati: float
    tempo_minuti: float
    costo_post_prod: float
    costo_extra: float
    costo_packaging: float
    data: Optional[str] = None
    # campi da JOIN
    progetto: Optional[str] = None
    stampante_modello: Optional[str] = None
    materiale: Optional[str] = None
    colore: Optional[str] = None
    codice_univoco: Optional[str] = None
    # snapshot costi storici
    snapshot_costo_totale_log: Optional[float] = None
    snapshot_data_calcolo: Optional[str] = None


# ─── SETTINGS ─────────────────────────────────────────────────────────────────

class Settings(BaseModel):
    costo_kwh: float
    costo_orario_post_prod: float
    costo_orario_manodopera: float = 15.0
    margine_lordo_default_perc: float = 35.0
    costo_orario_progettazione_default: float = 25.0
    criterio_rischio_default: str = "standard"
    ore_lavorative_mensili_farm: float
    maintenance_interval_hours: float = 250.0
    theme_mode: str = "Scuro"
    theme_accent: str = "#6C63FF"
    theme_font: str = "Inter"
    company_name: str = ""
    company_piva: str = ""
    company_cf: str = ""
    company_indirizzo: str = ""
    company_cap: str = ""
    company_citta: str = ""
    company_provincia: str = ""
    company_telefono: str = ""
    company_email: str = ""
    company_sito: str = ""


# ─── DASHBOARD ────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    entrate: float
    uscite: float
    margine: float


class ScortaItem(BaseModel):
    id: int
    nome: str
    materiale: str
    grammi_residui: float
    sotto_soglia: bool
    soglia: float


class ChartItem(BaseModel):
    name: str
    value: float


class DashboardAnalytics(BaseModel):
    entrate: float
    uscite: float
    materiali: List[ChartItem]
    stampanti: List[ChartItem]
    scorte: List[ScortaItem]


# ─── PREVENTIVI ───────────────────────────────────────────────────────────────

PreventivoStato = Literal["bozza", "confermato", "annullato", "convertito"]


class MaterialConfig(BaseModel):
    materiale: str
    marca: str = ""
    scarto_predefinito_perc: float = 0.0
    energy_multiplier: float = 1.0
    risk_perc_base: float = 0.0
    note: str = ""


class MaterialConfigOut(MaterialConfig):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CostoStraordinarioStrutturaCreate(BaseModel):
    descrizione: str
    importo_totale: float
    importo_residuo: Optional[float] = None
    quota_oraria: float = 0.0
    ore_da_spalmare_totali: Optional[float] = None
    ore_da_spalmare_residue: Optional[float] = None
    attivo: bool = True
    data: str
    note: str = ""


class CostoStraordinarioStrutturaOut(CostoStraordinarioStrutturaCreate):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PreventivoMaterialeInput(BaseModel):
    magazzino_id: Optional[int] = None
    materiale_nome: str = ""
    marca: str = ""
    colore: str = ""
    costo_kg: Optional[float] = None
    grammi_modello: float = 0.0
    scarto_perc: Optional[float] = None
    energy_multiplier: Optional[float] = None
    risk_perc: Optional[float] = None


class PreventivoMaterialeOut(BaseModel):
    id: int
    preventivo_id: int
    magazzino_id: Optional[int] = None
    materiale_nome_snapshot: str = ""
    marca_snapshot: str = ""
    colore_snapshot: str = ""
    costo_kg_snapshot: float = 0.0
    grammi_modello: float = 0.0
    scarto_perc: float = 0.0
    grammi_totali: float = 0.0
    energy_multiplier_snapshot: float = 1.0
    risk_perc_snapshot: float = 0.0
    costo_totale: float = 0.0


class PreventivoPostProduzioneInput(BaseModel):
    descrizione: str
    minuti: Optional[float] = None
    costo_manual: Optional[float] = None


class PreventivoPostProduzioneOut(BaseModel):
    id: int
    preventivo_id: int
    descrizione: str
    minuti: Optional[float] = None
    costo_manual: Optional[float] = None
    costo_totale: float = 0.0


class PreventivoComponenteExtraInput(BaseModel):
    descrizione: str
    quantita: float = 1.0
    costo_unitario: float = 0.0


class PreventivoComponenteExtraOut(BaseModel):
    id: int
    preventivo_id: int
    descrizione: str
    quantita: float = 1.0
    costo_unitario: float = 0.0
    costo_totale: float = 0.0


class PreventivoCalcoloBreakdown(BaseModel):
    costo_materiali: float = 0.0
    costo_energia: float = 0.0
    costo_setup: float = 0.0
    costo_post_produzione: float = 0.0
    costo_componenti_extra: float = 0.0
    costo_packing: float = 0.0
    costo_spedizione: float = 0.0
    costo_costi_fissi: float = 0.0
    costo_manutenzione_ordinaria: float = 0.0
    costo_manutenzione_straordinaria: float = 0.0
    costo_ammortamento: float = 0.0
    costo_straordinari_struttura: float = 0.0
    costo_progettazione: float = 0.0
    costo_rischio: float = 0.0
    costo_extra_manual: float = 0.0
    costo_pieno: float = 0.0
    prezzo_finale: float = 0.0
    utile_lordo: float = 0.0
    margine_lordo_perc: float = 0.0
    energy_multiplier_eff: float = 1.0
    rischio_totale_perc: float = 0.0
    quota_costi_fissi_oraria: float = 0.0
    quota_manutenzione_ordinaria_oraria: float = 0.0
    quota_manutenzione_straordinaria_oraria: float = 0.0
    quota_straordinari_struttura_oraria: float = 0.0
    quota_ammortamento_oraria: float = 0.0
    warning: Optional[str] = None


class PreventivoCreate(BaseModel):
    numero_preventivo: Optional[str] = None
    data: str
    cliente_id: Optional[int] = None
    cliente_nome_snapshot: str = ""
    progetto_nome: str
    stampante_id: int
    stato: PreventivoStato = "bozza"
    quantita: int = 1
    ore_stampa: float = 0.0
    minuti_setup: float = 0.0
    costo_progettazione: float = 0.0
    costo_packing: float = 0.0
    costo_spedizione: float = 0.0
    costo_extra_manual: float = 0.0
    margine_lordo_perc: float = 0.0
    override_rischio_perc: Optional[float] = None
    note: str = ""
    materiali: List[PreventivoMaterialeInput] = []
    post_produzione: List[PreventivoPostProduzioneInput] = []
    componenti_extra: List[PreventivoComponenteExtraInput] = []


class PreventivoListItem(BaseModel):
    id: int
    numero_preventivo: str
    data: str
    cliente_id: Optional[int] = None
    cliente_nome_snapshot: str = ""
    progetto_nome: str
    stampante_id: int
    stampante_nome_snapshot: str = ""
    stato: PreventivoStato
    quantita: int = 1
    costo_pieno: float = 0.0
    prezzo_finale: float = 0.0
    utile_lordo: float = 0.0
    margine_lordo_perc: float = 0.0
    updated_at: Optional[str] = None


class PreventivoOut(PreventivoListItem):
    ore_stampa: float = 0.0
    minuti_setup: float = 0.0
    costo_progettazione: float = 0.0
    costo_packing: float = 0.0
    costo_spedizione: float = 0.0
    costo_extra_manual: float = 0.0
    override_rischio_perc: Optional[float] = None
    note: str = ""
    snapshot_json: str = "{}"
    materiali: List[PreventivoMaterialeOut] = []
    post_produzione: List[PreventivoPostProduzioneOut] = []
    componenti_extra: List[PreventivoComponenteExtraOut] = []
    breakdown: PreventivoCalcoloBreakdown


class PreventivoPreviewResponse(BaseModel):
    breakdown: PreventivoCalcoloBreakdown
    materiali: List[PreventivoMaterialeOut] = []
    post_produzione: List[PreventivoPostProduzioneOut] = []
    componenti_extra: List[PreventivoComponenteExtraOut] = []


# ─── PIANIFICAZIONE PRODUZIONE (fase 7 + 7-bis) ──────────────────────────────

EventoCategoria = Literal["stampe", "manutenzione", "appuntamenti"]

class PianificazioneOut(BaseModel):
    id: int
    cliente_id: Optional[int] = None
    progetto_id: Optional[int] = None
    printer_id: Optional[int] = None
    titolo: str
    start_at: str
    end_at: Optional[str] = None
    durata_prevista_minuti: Optional[int] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    note: str = ""
    stato: str = "Pianificato"
    categoria: str = "stampe"
    created_at: Optional[str] = None
    cliente_nome: Optional[str] = None
    progetto_nome: Optional[str] = None
    printer_nome: Optional[str] = None


# ─── MAINTENANCE TEMPLATES (fase 7-bis) ──────────────────────────────────────

class MaintenanceTemplateCreate(BaseModel):
    nome: str
    descrizione: str = ""
    soglia_ore_massima: float = 200.0
    ordine_visualizzazione: int = 0
    attiva: bool = True
    costo_standard_intervento: float = 0.0


class MaintenanceTemplateOut(MaintenanceTemplateCreate):
    id: int
    created_at: Optional[str] = None


class PrinterMaintenanceItem(BaseModel):
    template_id: int
    template_nome: str
    soglia_ore_massima: float
    last_done_runtime_hours: float = 0.0
    last_done_at: Optional[str] = None
    note: str = ""
    elapsed_hours: float = 0.0
    remaining_hours: float = 0.0
    progress_percent: float = 0.0
    stato: str = "ok"


class PrinterMaintenanceStatusOut(BaseModel):
    printer_id: int
    printer_nome: str
    accumulated_runtime_hours: float
    items: List[PrinterMaintenanceItem]
    worst_stato: str = "ok"


class MarkDoneRequest(BaseModel):
    accumulated_hours: float
    note: str = ""
    tempo_impiegato_minuti: float

    @validator("tempo_impiegato_minuti")
    def minuti_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("tempo_impiegato_minuti deve essere > 0")
        return v


# ─── EXTRAORDINARY MAINTENANCE (fase 7-bis) ──────────────────────────────────

class ExtraordinaryComponent(BaseModel):
    descrizione: str
    link_acquisto: str = ""
    costo: float = 0.0


class ExtraordinaryMaintenanceCreate(BaseModel):
    printer_id: int
    descrizione_problema: str
    giorni_fermo: int = 0
    componenti: List[ExtraordinaryComponent] = []
    note: str = ""
    ore_print_farm_da_spalmare: Optional[float] = None


class ExtraordinaryMaintenanceOut(BaseModel):
    id: int
    printer_id: int
    printer_display_name: Optional[str] = None
    descrizione_problema: str
    giorni_fermo: int = 0
    componenti: List[ExtraordinaryComponent] = []
    note: str = ""
    costo_totale: float = 0.0
    spesa_una_tantum_id: Optional[int] = None
    created_at: Optional[str] = None
    # Spalmatura ricambi
    ore_print_farm_da_spalmare: Optional[float] = None
    quota_oraria_ricambi: float = 0.0
    ore_residue_da_spalmare: Optional[float] = None
    spalmatura_attiva: bool = False


# ─── MARGINI ──────────────────────────────────────────────────────────────────

class MarginiCalcolati(BaseModel):
    costo_3d: float
    quota_fissi: float
    costi_accessori: float
    costo_progettazione: float
    costo_totale: float
    margine_assoluto: float
    margine_perc: float
    ore_totali: float
    costo_unitario: float = 0.0
    margine_unitario: float = 0.0
    quota_manutenzione: float = 0.0
    has_estimated_logs: bool = False


class ProgettoCardData(BaseModel):
    progetto: ProgettoOut
    calcoli: MarginiCalcolati
