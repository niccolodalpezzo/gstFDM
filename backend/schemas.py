from pydantic import BaseModel
from typing import Optional, List


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
    stato: str = "Progettazione"
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


class StampanteOut(StampanteCreate):
    id: int
    accumulated_runtime_hours: float = 0.0
    active_nozzle_name: Optional[str] = None
    active_nozzle_uid: Optional[str] = None


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
    costo_accessori: float
    costo_progettazione: float
    costo_extra_progetto: float
    costo_totale: float
    margine: float
    margine_perc: float
    ore_totali: float
    n_stampe: int


# ─── COMPONENT REPLACEMENTS ──────────────────────────────────────────────────

class ComponentReplacementCreate(BaseModel):
    name: str
    material: str = ""
    tipo_pezzo: str = "Altro"
    stampante_ids: List[int] = []
    compatibility_label: str = ""
    dimensions: str = ""
    installed_date: Optional[str] = None
    notes: str = ""


class ComponentReplacementOut(BaseModel):
    id: int
    asset_uid: str
    name: str
    material: str = ""
    tipo_pezzo: str = "Altro"
    stampante_ids: List[int] = []
    stampante_modelli: List[str] = []
    compatibility_label: str = ""
    dimensions: str = ""
    installed_date: Optional[str] = None
    notes: str = ""
    print_hours_accumulated: float = 0.0


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


# ─── SETTINGS ─────────────────────────────────────────────────────────────────

class Settings(BaseModel):
    costo_kwh: float
    costo_orario_post_prod: float
    ore_lavorative_mensili_farm: float
    theme_mode: str = "Scuro"
    theme_accent: str = "#6C63FF"
    theme_font: str = "Inter"


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


class MarginiCalcolati(BaseModel):
    costo_3d: float
    quota_fissi: float
    costi_accessori: float
    costo_progettazione: float
    costo_totale: float
    margine_assoluto: float
    margine_perc: float
    ore_totali: float


class ProgettoCardData(BaseModel):
    progetto: ProgettoOut
    calcoli: MarginiCalcolati
