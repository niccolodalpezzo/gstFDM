from pydantic import BaseModel
from typing import Optional


# ─── PROGETTI ─────────────────────────────────────────────────────────────────

class ProgettoCreate(BaseModel):
    nome: str
    cliente: str = ""
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


class StampanteOut(StampanteCreate):
    id: int


# ─── MAGAZZINO ────────────────────────────────────────────────────────────────

class MagazzinoCreate(BaseModel):
    marca: str = ""
    materiale: str
    colore: str
    costo_kg: float
    grammi_residui: float
    stato: str = "Nuova"
    quantita_stock: int = 1


class MagazzinoOut(MagazzinoCreate):
    id: int
    codice_univoco: Optional[str] = None


# ─── COSTI FISSI ──────────────────────────────────────────────────────────────

class CostoFissoCreate(BaseModel):
    nome: str
    importo_mensile: float
    attivo: bool = True


class CostoFissoOut(CostoFissoCreate):
    id: int


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
