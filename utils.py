import os
import json
from database import init_db

# Definisce le directory necessarie
_ROOT = os.path.dirname(os.path.abspath(__file__))
REQUIRED_DIRS = [os.path.join(_ROOT, d) for d in ['data', 'exports', 'configs']]
SETTINGS_FILE = os.path.join(_ROOT, 'configs', 'settings.json')

# Costi globali predefiniti (energia, manodopera)
DEFAULT_SETTINGS = {
    "costo_kwh": 0.25,
    "costo_orario_post_prod": 15.0,
    "costo_orario_manodopera": 15.0,
    "margine_lordo_default_perc": 35.0,
    "costo_orario_progettazione_default": 25.0,
    "criterio_rischio_default": "standard",
    "ore_lavorative_mensili_farm": 160,  # Ore stimate di stampa totali nel mese per calcolo costi fissi
    "maintenance_interval_hours": 250.0,
    "theme_mode": "Scuro",               # Default Dark mode
    "theme_accent": "#6C63FF",           # Default Accent color (Purple)
    "theme_font": "Inter"                # Default Font
}

def setup_environment():
    """Crea le cartelle e i file di configurazione necessari al primo avvio."""
    for directory in REQUIRED_DIRS:
        os.makedirs(directory, exist_ok=True)
    
    # Inizializza settings.json se non esiste
    if not os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(DEFAULT_SETTINGS, f, indent=4)
            
    # Inizializza il database
    init_db()

def load_settings():
    """Carica i settings dal file JSON."""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    return DEFAULT_SETTINGS

def save_settings(settings):
    """Salva i settings nel file JSON."""
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=4)
