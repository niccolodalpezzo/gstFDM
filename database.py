import os
import sqlite3
import random
import string
import pandas as pd
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'printfarm.sqlite')

@contextmanager
def get_db_connection():
    """Context manager per la connessione SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def _migrate(cursor):
    """Aggiunge colonne mancanti ai database esistenti (migrazioni sicure)."""
    migrations = [
        # Tabella magazzino
        ("magazzino", "marca", "TEXT DEFAULT ''"),
        ("magazzino", "stato", "TEXT DEFAULT 'Nuova'"),
        ("magazzino", "quantita_stock", "INTEGER DEFAULT 1"),
        ("magazzino", "codice_univoco", "TEXT DEFAULT NULL"),
        # Tabella stampanti
        ("stampanti", "marca", "TEXT DEFAULT ''"),
        ("stampanti", "diametro_ugello", "REAL DEFAULT 0.4"),
        # Tabella progetti
        ("progetti", "quantita_da_produrre", "INTEGER DEFAULT 1"),
        ("progetti", "ore_progettazione", "REAL DEFAULT 0.0"),
        ("progetti", "costo_extra_progetto", "REAL DEFAULT 0.0"),
        # Tabella log_stampe
        ("log_stampe", "data", "TEXT"),
        # Tabella costi_fissi
        ("costi_fissi", "data_inizio", "TEXT DEFAULT NULL"),
        ("costi_fissi", "frequenza", "TEXT DEFAULT 'Monthly'"),
        # Tabella stampanti — fleet fields
        ("stampanti", "asset_name",             "TEXT DEFAULT ''"),
        ("stampanti", "status",                 "TEXT DEFAULT 'Idle'"),
        ("stampanti", "build_volume_x",         "REAL DEFAULT 0"),
        ("stampanti", "build_volume_y",         "REAL DEFAULT 0"),
        ("stampanti", "build_volume_z",         "REAL DEFAULT 0"),
        ("stampanti", "initial_runtime_hours",  "REAL DEFAULT 0"),
        ("stampanti", "active_nozzle_id",       "INTEGER DEFAULT NULL"),
        # Magazzino — tare tracking
        ("magazzino", "gross_weight",            "REAL DEFAULT NULL"),
        ("magazzino", "fornitore_id",            "INTEGER DEFAULT NULL"),
        # Spese una tantum
        ("spese_una_tantum", "fornitore_id",     "INTEGER DEFAULT NULL"),
        # Progetti
        ("progetti", "cliente_id",               "INTEGER DEFAULT NULL"),
        # Component replacements — tipo pezzo
        ("component_replacements", "tipo_pezzo", "TEXT DEFAULT 'Altro'"),
    ]
    for table, column, col_def in migrations:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        except sqlite3.OperationalError:
            pass  # Colonna già presente

def init_db():
    """Inizializza lo schema del database e applica le migrazioni."""
    with get_db_connection() as conn:
        c = conn.cursor()

        # Tabella Progetti
        c.execute('''
            CREATE TABLE IF NOT EXISTS progetti (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cliente TEXT DEFAULT '',
                cliente_id INTEGER DEFAULT NULL,
                budget REAL DEFAULT 0.0,
                stato TEXT DEFAULT 'Progettazione',
                quantita_da_produrre INTEGER DEFAULT 1,
                ore_progettazione REAL DEFAULT 0.0,
                costo_extra_progetto REAL DEFAULT 0.0,
                FOREIGN KEY (cliente_id) REFERENCES clienti(id)
            )
        ''')

        # Tabella Stampanti
        c.execute('''
            CREATE TABLE IF NOT EXISTS stampanti (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marca TEXT DEFAULT '',
                modello TEXT NOT NULL,
                diametro_ugello REAL DEFAULT 0.4,
                consumo_w REAL NOT NULL,
                costo_acquisto REAL NOT NULL,
                ammortamento_orario REAL NOT NULL
            )
        ''')

        # Tabella Magazzino (Bobine)
        c.execute('''
            CREATE TABLE IF NOT EXISTS magazzino (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marca TEXT DEFAULT '',
                materiale TEXT NOT NULL,
                colore TEXT NOT NULL,
                costo_kg REAL NOT NULL,
                grammi_residui REAL NOT NULL,
                stato TEXT DEFAULT 'Nuova',
                quantita_stock INTEGER DEFAULT 1,
                codice_univoco TEXT DEFAULT NULL,
                fornitore_id INTEGER DEFAULT NULL,
                FOREIGN KEY (fornitore_id) REFERENCES fornitori(id)
            )
        ''')

        # Tabella Costi Fissi
        c.execute('''
            CREATE TABLE IF NOT EXISTS costi_fissi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                importo_mensile REAL NOT NULL,
                attivo BOOLEAN DEFAULT 1,
                data_inizio TEXT DEFAULT NULL,
                frequenza TEXT DEFAULT 'Monthly'
            )
        ''')

        # Tabella Spese Una Tantum
        c.execute('''
            CREATE TABLE IF NOT EXISTS spese_una_tantum (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                descrizione TEXT NOT NULL,
                importo REAL NOT NULL,
                data TEXT NOT NULL,
                note TEXT DEFAULT '',
                fornitore_id INTEGER DEFAULT NULL,
                FOREIGN KEY (fornitore_id) REFERENCES fornitori(id)
            )
        ''')

        # Tabella Log Stampe
        c.execute('''
            CREATE TABLE IF NOT EXISTS log_stampe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                progetto_id INTEGER NOT NULL,
                stampante_id INTEGER NOT NULL,
                magazzino_id INTEGER NOT NULL,
                grammi_usati REAL NOT NULL,
                tempo_minuti REAL NOT NULL,
                costo_post_prod REAL DEFAULT 0.0,
                costo_extra REAL DEFAULT 0.0,
                costo_packaging REAL DEFAULT 0.0,
                FOREIGN KEY (progetto_id) REFERENCES progetti (id),
                FOREIGN KEY (stampante_id) REFERENCES stampanti (id),
                FOREIGN KEY (magazzino_id) REFERENCES magazzino (id)
            )
        ''')

        # Tabella Component Replacements
        c.execute('''
            CREATE TABLE IF NOT EXISTS component_replacements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_uid TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                material TEXT DEFAULT '',
                stampante_id INTEGER DEFAULT NULL,
                compatibility_label TEXT DEFAULT '',
                dimensions TEXT DEFAULT '',
                installed_date TEXT DEFAULT NULL,
                notes TEXT DEFAULT '',
                FOREIGN KEY (stampante_id) REFERENCES stampanti (id)
            )
        ''')

        # Junction table: component ↔ printers (many-to-many)
        c.execute('''
            CREATE TABLE IF NOT EXISTS component_replacement_printers (
                component_id INTEGER NOT NULL,
                stampante_id INTEGER NOT NULL,
                PRIMARY KEY (component_id, stampante_id),
                FOREIGN KEY (component_id) REFERENCES component_replacements(id) ON DELETE CASCADE,
                FOREIGN KEY (stampante_id) REFERENCES stampanti(id) ON DELETE CASCADE
            )
        ''')

        # Migra stampante_id esistente → junction table (idempotente)
        c.execute('''
            INSERT OR IGNORE INTO component_replacement_printers (component_id, stampante_id)
            SELECT id, stampante_id FROM component_replacements WHERE stampante_id IS NOT NULL
        ''')

        # Tabella Generic Assets
        c.execute('''
            CREATE TABLE IF NOT EXISTS generic_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_uid TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                quantity REAL DEFAULT 0,
                unit TEXT DEFAULT 'pcs',
                unit_cost REAL DEFAULT 0.0,
                notes TEXT DEFAULT ''
            )
        ''')

        # Tabella Tare Overrides
        c.execute('''
            CREATE TABLE IF NOT EXISTS tare_overrides (
                marca      TEXT NOT NULL,
                materiale  TEXT NOT NULL DEFAULT '',
                tare_g     REAL NOT NULL,
                PRIMARY KEY (marca, materiale)
            )
        ''')

        # Tabella Material Density Ratios (consumo relativo al PLA)
        c.execute('''
            CREATE TABLE IF NOT EXISTS material_density_ratios (
                material  TEXT PRIMARY KEY NOT NULL,
                multiplier REAL NOT NULL DEFAULT 1.0,
                notes     TEXT DEFAULT ''
            )
        ''')
        # Seed valori di default (solo se tabella vuota)
        existing = c.execute("SELECT COUNT(*) FROM material_density_ratios").fetchone()[0]
        if existing == 0:
            defaults = [
                ("PLA",    1.0,  "Baseline reference"),
                ("PLA+",   1.0,  "Same as PLA"),
                ("PETG",   1.05, ""),
                ("ABS",    0.85, ""),
                ("ASA",    0.85, ""),
                ("TPU",    0.98, ""),
                ("PC",     0.97, ""),
                ("PA-CF",  0.92, ""),
                ("HIPS",   0.86, ""),
            ]
            c.executemany(
                "INSERT OR IGNORE INTO material_density_ratios (material, multiplier, notes) VALUES (?,?,?)",
                defaults
            )

        # Tabella Clienti
        c.execute('''
            CREATE TABLE IF NOT EXISTS clienti (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                azienda TEXT DEFAULT '',
                email TEXT DEFAULT '',
                p_iva TEXT DEFAULT '',
                sdi TEXT DEFAULT '',
                cf TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                note TEXT DEFAULT '',
                data_aggiunta TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Tabella Fornitori
        c.execute('''
            CREATE TABLE IF NOT EXISTS fornitori (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ragione_sociale TEXT NOT NULL,
                p_iva TEXT DEFAULT '',
                sdi TEXT DEFAULT '',
                referente TEXT DEFAULT '',
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                categoria TEXT DEFAULT '',
                note TEXT DEFAULT '',
                data_aggiunta TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Applica migrazioni per DB esistenti
        _migrate(c)
        conn.commit()


# ─── PROGETTI ────────────────────────────────────────────────────────────────

def get_progetti():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM progetti", conn)

def add_progetto(nome, cliente, budget, stato='Progettazione', quantita=1, ore_prog=0.0, costo_extra=0.0, cliente_id=None):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO progetti (nome, cliente, budget, stato, quantita_da_produrre, ore_progettazione, costo_extra_progetto, cliente_id) VALUES (?,?,?,?,?,?,?,?)",
            (nome, cliente, budget, stato, quantita, ore_prog, costo_extra, cliente_id)
        )
        conn.commit()

def update_progetto(progetto_id, nome, cliente, budget, stato, quantita, ore_prog, costo_extra, cliente_id=None):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE progetti SET nome=?, cliente=?, budget=?, stato=?, quantita_da_produrre=?, ore_progettazione=?, costo_extra_progetto=?, cliente_id=? WHERE id=?",
            (nome, cliente, budget, stato, quantita, ore_prog, costo_extra, cliente_id, progetto_id)
        )
        conn.commit()

def delete_progetto(progetto_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM log_stampe WHERE progetto_id=?", (progetto_id,))
        conn.execute("DELETE FROM progetti WHERE id=?", (progetto_id,))
        conn.commit()


# ─── STAMPANTI ───────────────────────────────────────────────────────────────

def get_stampanti():
    with get_db_connection() as conn:
        return pd.read_sql_query("""
            SELECT s.*,
                   COALESCE(s.initial_runtime_hours, 0) + COALESCE(
                     (SELECT ROUND(SUM(l.tempo_minuti) / 60.0, 2)
                      FROM log_stampe l WHERE l.stampante_id = s.id),
                     0.0
                   ) AS accumulated_runtime_hours,
                   cr.name      AS active_nozzle_name,
                   cr.asset_uid AS active_nozzle_uid
            FROM stampanti s
            LEFT JOIN component_replacements cr ON s.active_nozzle_id = cr.id
        """, conn)

def add_stampante(marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario,
                  asset_name="", status="Idle", build_volume_x=0, build_volume_y=0,
                  build_volume_z=0, initial_runtime_hours=0, active_nozzle_id=None):
    with get_db_connection() as conn:
        cur = conn.execute(
            """INSERT INTO stampanti
               (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario,
                asset_name, status, build_volume_x, build_volume_y, build_volume_z,
                initial_runtime_hours, active_nozzle_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario,
             asset_name, status, build_volume_x, build_volume_y, build_volume_z,
             initial_runtime_hours, active_nozzle_id)
        )
        conn.commit()
        return cur.lastrowid


def update_stampante(stampante_id, marca, modello, diametro_ugello, consumo_w, costo_acquisto,
                     ammortamento_orario, asset_name="", status="Idle", build_volume_x=0,
                     build_volume_y=0, build_volume_z=0, initial_runtime_hours=0,
                     active_nozzle_id=None):
    with get_db_connection() as conn:
        conn.execute(
            """UPDATE stampanti SET
               marca=?, modello=?, diametro_ugello=?, consumo_w=?, costo_acquisto=?,
               ammortamento_orario=?, asset_name=?, status=?, build_volume_x=?,
               build_volume_y=?, build_volume_z=?, initial_runtime_hours=?,
               active_nozzle_id=?
               WHERE id=?""",
            (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario,
             asset_name, status, build_volume_x, build_volume_y, build_volume_z,
             initial_runtime_hours, active_nozzle_id, stampante_id)
        )
        conn.commit()

def delete_stampante(stampante_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM stampanti WHERE id=?", (stampante_id,))
        conn.commit()


# ─── MAGAZZINO (BOBINE) ──────────────────────────────────────────────────────

def _genera_codice_4():
    """Genera un codice alfanumerico univoco di 4 caratteri maiuscoli."""
    chars = string.ascii_uppercase + string.digits
    with get_db_connection() as conn:
        while True:
            codice = ''.join(random.choices(chars, k=4))
            exists = conn.execute("SELECT 1 FROM magazzino WHERE codice_univoco=?", (codice,)).fetchone()
            if not exists:
                return codice

def get_magazzino():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM magazzino ORDER BY stato, marca, materiale", conn)

def add_magazzino(marca, materiale, colore, costo_kg, grammi_residui, stato='Nuova', quantita_stock=1, fornitore_id=None):
    """Aggiunge una nuova bobina. Stato 'Nuova' ha un quantita_stock, le Usate un codice."""
    codice = None
    if stato == 'Usata':
        codice = _genera_codice_4()
    with get_db_connection() as conn:
        cur = conn.execute(
            "INSERT INTO magazzino (marca, materiale, colore, costo_kg, grammi_residui, stato, quantita_stock, codice_univoco, fornitore_id) VALUES (?,?,?,?,?,?,?,?,?)",
            (marca, materiale, colore, costo_kg, grammi_residui, stato, quantita_stock, codice, fornitore_id)
        )
        conn.commit()
        return cur.lastrowid

def attiva_bobina_nuova(magazzino_id):
    """
    Attiva una bobina 'Nuova': scala la quantità stock e crea un'istanza 'Usata'
    con un codice univoco di 4 caratteri. Ritorna il codice generato.
    """
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM magazzino WHERE id=?", (magazzino_id,)).fetchone()
        if not row:
            return None
        codice = _genera_codice_4()
        # Crea l'istanza Usata
        conn.execute(
            "INSERT INTO magazzino (marca, materiale, colore, costo_kg, grammi_residui, stato, quantita_stock, codice_univoco) VALUES (?,?,?,?,?,?,?,?)",
            (row['marca'], row['materiale'], row['colore'], row['costo_kg'], row['grammi_residui'], 'Usata', 0, codice)
        )
        # Scala stock
        nuova_qty = max(0, row['quantita_stock'] - 1)
        if nuova_qty == 0:
            conn.execute("UPDATE magazzino SET quantita_stock=0, stato='Terminata' WHERE id=?", (magazzino_id,))
        else:
            conn.execute("UPDATE magazzino SET quantita_stock=? WHERE id=?", (nuova_qty, magazzino_id))
        conn.commit()
        return codice

def get_bobina_by_codice(codice):
    """Cerca una bobina 'Usata' tramite il codice univoco."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM magazzino WHERE codice_univoco=? AND stato='Usata'", (codice.upper(),)).fetchone()
        return dict(row) if row else None

def update_magazzino_details(magazzino_id, marca, materiale, colore, costo_kg, grammi_residui, quantita_stock, fornitore_id=None):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE magazzino SET marca=?, materiale=?, colore=?, costo_kg=?, grammi_residui=?, quantita_stock=?, fornitore_id=? WHERE id=?",
            (marca, materiale, colore, costo_kg, grammi_residui, quantita_stock, fornitore_id, magazzino_id)
        )
        conn.commit()

def update_magazzino_grammi(magazzino_id, grammi_da_sottrarre):
    """Sottrae grammi da una bobina e la segna 'Terminata' se raggiunge zero."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT grammi_residui FROM magazzino WHERE id=?", (magazzino_id,)).fetchone()
        if not row:
            return
        nuovi_grammi = max(0.0, row['grammi_residui'] - grammi_da_sottrarre)
        nuovo_stato = 'Terminata' if nuovi_grammi <= 0 else 'Usata'
        conn.execute("UPDATE magazzino SET grammi_residui=?, stato=? WHERE id=?", (nuovi_grammi, nuovo_stato, magazzino_id))
        conn.commit()

def delete_magazzino(magazzino_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM magazzino WHERE id=?", (magazzino_id,))
        conn.commit()

def update_gross_weight(magazzino_id, gross_weight, net_weight):
    """Aggiorna il gross_weight e ricalcola grammi_residui (net weight)."""
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE magazzino SET gross_weight=?, grammi_residui=? WHERE id=?",
            (gross_weight, net_weight, magazzino_id)
        )
        conn.commit()


# ─── TARE OVERRIDES ───────────────────────────────────────────────────────────

def get_tare_overrides():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM tare_overrides ORDER BY marca, materiale", conn)

def set_tare_override(marca, materiale, tare_g):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO tare_overrides (marca, materiale, tare_g) VALUES (?,?,?) "
            "ON CONFLICT(marca, materiale) DO UPDATE SET tare_g=excluded.tare_g",
            (marca, materiale if materiale else '', tare_g)
        )
        conn.commit()

def delete_tare_override(marca, materiale):
    with get_db_connection() as conn:
        conn.execute(
            "DELETE FROM tare_overrides WHERE marca=? AND materiale=?",
            (marca, materiale if materiale else '')
        )
        conn.commit()


# ─── MATERIAL DENSITY RATIOS ─────────────────────────────────────────────────

def get_material_density_ratios():
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT material, multiplier, notes FROM material_density_ratios ORDER BY material"
        ).fetchall()
        return [dict(r) for r in rows]

def upsert_material_density_ratio(material: str, multiplier: float, notes: str = ''):
    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO material_density_ratios (material, multiplier, notes) VALUES (?,?,?)
               ON CONFLICT(material) DO UPDATE SET multiplier=excluded.multiplier, notes=excluded.notes""",
            (material.strip(), multiplier, notes)
        )
        conn.commit()

def delete_material_density_ratio(material: str):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM material_density_ratios WHERE material=?", (material,))
        conn.commit()


# ─── COSTI FISSI ─────────────────────────────────────────────────────────────

def get_costi_fissi():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM costi_fissi", conn)

def add_costo_fisso(nome, importo_mensile, attivo=True, data_inizio=None, frequenza='Monthly'):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO costi_fissi (nome, importo_mensile, attivo, data_inizio, frequenza) VALUES (?,?,?,?,?)",
            (nome, importo_mensile, attivo, data_inizio, frequenza)
        )
        conn.commit()

def toggle_costo_fisso(costo_id, attivo):
    with get_db_connection() as conn:
        conn.execute("UPDATE costi_fissi SET attivo=? WHERE id=?", (attivo, costo_id))
        conn.commit()

def delete_costo_fisso(costo_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM costi_fissi WHERE id=?", (costo_id,))
        conn.commit()


# ─── SPESE UNA TANTUM ─────────────────────────────────────────────────────────

def get_spese_una_tantum():
    with get_db_connection() as conn:
        return pd.read_sql_query(
            "SELECT * FROM spese_una_tantum ORDER BY data DESC", conn
        )

def add_spesa_una_tantum(descrizione, importo, data, note='', fornitore_id=None):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO spese_una_tantum (descrizione, importo, data, note, fornitore_id) VALUES (?,?,?,?,?)",
            (descrizione, importo, data, note, fornitore_id)
        )
        conn.commit()

def delete_spesa_una_tantum(spesa_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM spese_una_tantum WHERE id=?", (spesa_id,))
        conn.commit()


# ─── PROJECT COST ANALYSIS ───────────────────────────────────────────────────

def get_project_cost_analysis():
    """Returns detailed cost breakdown for each project."""
    settings_data = {}
    try:
        from utils import load_settings
        settings_data = load_settings()
    except Exception:
        pass
    kwh_cost = float(settings_data.get("costo_kwh", 0.25))
    hourly_rate = float(settings_data.get("costo_orario_post_prod", 15.0))

    # Load density ratio multipliers: {material_upper: multiplier}
    density_ratios = {r["material"].upper(): float(r["multiplier"]) for r in get_material_density_ratios()}

    with get_db_connection() as conn:
        progetti_df = pd.read_sql_query("SELECT * FROM progetti", conn)
        result = []
        for _, p in progetti_df.iterrows():
            logs = pd.read_sql_query(
                """SELECT l.grammi_usati, l.tempo_minuti,
                          l.costo_post_prod, l.costo_extra, l.costo_packaging,
                          m.costo_kg, m.materiale, s.consumo_w, s.ammortamento_orario
                   FROM log_stampe l
                   JOIN magazzino m ON l.magazzino_id = m.id
                   JOIN stampanti s ON l.stampante_id = s.id
                   WHERE l.progetto_id = ?""",
                conn, params=(int(p['id']),)
            )

            costo_materiali = 0.0
            costo_energia = 0.0
            costo_ammortamento = 0.0
            costo_accessori = 0.0
            ore_totali = 0.0

            for _, log in logs.iterrows():
                tempo_h = float(log['tempo_minuti']) / 60.0
                ore_totali += tempo_h
                multiplier = density_ratios.get(str(log['materiale']).upper(), 1.0)
                costo_materiali += (float(log['costo_kg']) / 1000.0) * float(log['grammi_usati']) * multiplier
                costo_energia += (float(log['consumo_w']) / 1000.0) * tempo_h * kwh_cost
                costo_ammortamento += float(log['ammortamento_orario']) * tempo_h
                costo_accessori += (float(log['costo_post_prod']) +
                                    float(log['costo_extra']) +
                                    float(log['costo_packaging']))

            costo_progettazione = float(p['ore_progettazione']) * hourly_rate
            costo_extra_progetto = float(p['costo_extra_progetto'])
            costo_totale = (costo_materiali + costo_energia + costo_ammortamento +
                            costo_accessori + costo_progettazione + costo_extra_progetto)
            budget = float(p['budget'])
            margine = budget - costo_totale
            margine_perc = (margine / budget * 100.0) if budget > 0 else 0.0

            result.append({
                'id': int(p['id']),
                'nome': str(p['nome']),
                'cliente': str(p['cliente']),
                'stato': str(p['stato']),
                'budget': round(budget, 2),
                'costo_materiali': round(costo_materiali, 2),
                'costo_energia': round(costo_energia, 2),
                'costo_ammortamento': round(costo_ammortamento, 2),
                'costo_accessori': round(costo_accessori, 2),
                'costo_progettazione': round(costo_progettazione, 2),
                'costo_extra_progetto': round(costo_extra_progetto, 2),
                'costo_totale': round(costo_totale, 2),
                'margine': round(margine, 2),
                'margine_perc': round(margine_perc, 1),
                'ore_totali': round(ore_totali, 1),
                'n_stampe': len(logs),
            })

    return result


# ─── LOG STAMPE ──────────────────────────────────────────────────────────────

def get_log_stampe(progetto_id=None):
    with get_db_connection() as conn:
        query = """
            SELECT l.*, p.nome as progetto, s.modello as stampante_modello,
                   m.materiale, m.colore, m.codice_univoco
            FROM log_stampe l
            JOIN progetti p ON l.progetto_id = p.id
            JOIN stampanti s ON l.stampante_id = s.id
            JOIN magazzino m ON l.magazzino_id = m.id
        """
        if progetto_id:
            query += f" WHERE l.progetto_id = {int(progetto_id)}"
        return pd.read_sql_query(query, conn)

def add_log_stampa(progetto_id, stampante_id, magazzino_id, grammi_usati, tempo_minuti,
                   costo_post_prod=0.0, costo_extra=0.0, costo_packaging=0.0, data=None):
    import datetime
    if data is None:
        data = datetime.date.today().isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO log_stampe
               (progetto_id, stampante_id, magazzino_id, grammi_usati, tempo_minuti,
                costo_post_prod, costo_extra, costo_packaging, data)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (progetto_id, stampante_id, magazzino_id, grammi_usati, tempo_minuti,
             costo_post_prod, costo_extra, costo_packaging, data)
        )
        conn.commit()


def get_dashboard_analytics(dal: str, al: str):
    """
    Ritorna i dati aggregati per la dashboard nel periodo [dal, al] (date ISO yyyy-mm-dd).
    """
    with get_db_connection() as conn:
        # Log nel periodo con dati stampante e materiale
        logs_df = pd.read_sql_query(
            """
            SELECT l.grammi_usati, l.tempo_minuti,
                   l.costo_post_prod, l.costo_extra, l.costo_packaging,
                   l.progetto_id, l.stampante_id, l.magazzino_id,
                   m.materiale, m.colore, m.costo_kg,
                   s.modello as stampante_modello, s.consumo_w, s.ammortamento_orario
            FROM log_stampe l
            JOIN magazzino m ON l.magazzino_id = m.id
            JOIN stampanti s ON l.stampante_id = s.id
            WHERE l.data >= ? AND l.data <= ?
            """,
            conn, params=(dal, al)
        )

        # Budget progetti terminati con almeno un log nel periodo
        progetti_ids = tuple(logs_df["progetto_id"].unique().tolist()) if not logs_df.empty else (0,)
        placeholders = ",".join("?" * len(progetti_ids))
        entrate_row = conn.execute(
            f"SELECT COALESCE(SUM(budget),0) FROM progetti WHERE stato='Terminato' AND id IN ({placeholders})",
            list(progetti_ids)
        ).fetchone()
        entrate = float(entrate_row[0]) if entrate_row else 0.0

        # Scorte attive sotto soglia (200g di default)
        scorte_df = pd.read_sql_query(
            "SELECT id, marca, materiale, colore, grammi_residui FROM magazzino WHERE stato='Usata' ORDER BY grammi_residui ASC",
            conn
        )

    # --- KPI uscite ---
    settings_data = {}
    try:
        from utils import load_settings
        settings_data = load_settings()
    except Exception:
        pass
    kwh_cost = float(settings_data.get("costo_kwh", 0.25))

    density_ratios = {r["material"].upper(): float(r["multiplier"]) for r in get_material_density_ratios()}

    uscite = 0.0
    if not logs_df.empty:
        for _, row in logs_df.iterrows():
            tempo_h = float(row["tempo_minuti"]) / 60.0
            multiplier = density_ratios.get(str(row["materiale"]).upper(), 1.0)
            costo_mat = (float(row["costo_kg"]) / 1000.0) * float(row["grammi_usati"]) * multiplier
            costo_en  = (float(row["consumo_w"]) / 1000.0) * tempo_h * kwh_cost
            costo_amm = float(row["ammortamento_orario"]) * tempo_h
            acc = float(row["costo_post_prod"]) + float(row["costo_extra"]) + float(row["costo_packaging"])
            uscite += costo_mat + costo_en + costo_amm + acc

    # --- Materiali ---
    mat_list = []
    if not logs_df.empty:
        for nome, grp in logs_df.groupby("materiale"):
            mat_list.append({"name": nome, "value": round(float(grp["grammi_usati"].sum()), 1)})
    mat_list.sort(key=lambda x: x["value"], reverse=True)

    # --- Stampanti ---
    stamp_list = []
    if not logs_df.empty:
        for nome, grp in logs_df.groupby("stampante_modello"):
            ore = round(float(grp["tempo_minuti"].sum()) / 60.0, 1)
            stamp_list.append({"name": nome, "value": ore})
    stamp_list.sort(key=lambda x: x["value"], reverse=True)

    # --- Scorte ---
    soglia = 200.0
    scorte_list = []
    for _, row in scorte_df.iterrows():
        scorte_list.append({
            "id": int(row["id"]),
            "nome": f"{row['marca']} {row['materiale']} {row['colore']}".strip(),
            "materiale": str(row["materiale"]),
            "grammi_residui": round(float(row["grammi_residui"]), 0),
            "sotto_soglia": float(row["grammi_residui"]) < soglia,
            "soglia": soglia,
        })

    return {
        "entrate": round(entrate, 2),
        "uscite": round(uscite, 2),
        "materiali": mat_list,
        "stampanti": stamp_list,
        "scorte": scorte_list,
    }


# ─── COMPONENT REPLACEMENTS ──────────────────────────────────────────────────

def _next_component_uid():
    """Generates next sequential UID in format RP001."""
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT asset_uid FROM component_replacements ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if not row:
            return "RP001"
        try:
            num = int(row["asset_uid"][2:]) + 1
        except (ValueError, IndexError):
            num = 1
        return f"RP{num:03d}"


def get_component_replacements():
    with get_db_connection() as conn:
        rows = conn.execute(
            """SELECT cr.id, cr.asset_uid, cr.name, cr.material, cr.tipo_pezzo,
                      cr.compatibility_label, cr.dimensions, cr.installed_date, cr.notes,
                      GROUP_CONCAT(crp.stampante_id)      AS stampante_ids_str,
                      GROUP_CONCAT(DISTINCT s.modello)    AS stampante_modelli_str,
                      COALESCE(
                        (SELECT ROUND(SUM(l.tempo_minuti) / 60.0, 1)
                         FROM log_stampe l
                         WHERE l.stampante_id IN (
                               SELECT crp2.stampante_id
                               FROM component_replacement_printers crp2
                               WHERE crp2.component_id = cr.id)
                           AND (cr.installed_date IS NULL
                                OR (l.data IS NOT NULL AND l.data >= cr.installed_date))),
                        0.0
                      ) AS print_hours_accumulated
               FROM component_replacements cr
               LEFT JOIN component_replacement_printers crp ON cr.id = crp.component_id
               LEFT JOIN stampanti s ON crp.stampante_id = s.id
               GROUP BY cr.id
               ORDER BY cr.id"""
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            ids_str = d.pop("stampante_ids_str", None)
            mod_str = d.pop("stampante_modelli_str", None)
            d["stampante_ids"]     = [int(x) for x in ids_str.split(",") if x] if ids_str else []
            d["stampante_modelli"] = [x for x in mod_str.split(",") if x]      if mod_str else []
            result.append(d)
        return result


def add_component_replacement(name, material, stampante_ids, compatibility_label,
                               dimensions, installed_date, notes, tipo_pezzo='Altro'):
    uid = _next_component_uid()
    with get_db_connection() as conn:
        cur = conn.execute(
            """INSERT INTO component_replacements
               (asset_uid, name, material, tipo_pezzo, compatibility_label, dimensions, installed_date, notes)
               VALUES (?,?,?,?,?,?,?,?)""",
            (uid, name, material, tipo_pezzo, compatibility_label, dimensions, installed_date, notes)
        )
        component_id = cur.lastrowid
        for sid in (stampante_ids or []):
            conn.execute(
                "INSERT OR IGNORE INTO component_replacement_printers (component_id, stampante_id) VALUES (?,?)",
                (component_id, sid)
            )
        conn.commit()
    return uid


def delete_component_replacement(component_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM component_replacements WHERE id=?", (component_id,))
        conn.commit()


# ─── GENERIC ASSETS ──────────────────────────────────────────────────────────

def _next_generic_asset_uid():
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT asset_uid FROM generic_assets ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if not row:
            return "GA001"
        try:
            num = int(row["asset_uid"][2:]) + 1
        except (ValueError, IndexError):
            num = 1
        return f"GA{num:03d}"


def get_generic_assets():
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM generic_assets ORDER BY category, name"
        ).fetchall()
        return [dict(r) for r in rows]


def add_generic_asset(name, category, quantity, unit, unit_cost, notes):
    uid = _next_generic_asset_uid()
    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO generic_assets (asset_uid, name, category, quantity, unit, unit_cost, notes)
               VALUES (?,?,?,?,?,?,?)""",
            (uid, name, category, quantity, unit, unit_cost, notes)
        )
        conn.commit()


def update_generic_asset_quantity(asset_id, quantity):
    with get_db_connection() as conn:
        conn.execute("UPDATE generic_assets SET quantity=? WHERE id=?", (quantity, asset_id))
        conn.commit()


def delete_generic_asset(asset_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM generic_assets WHERE id=?", (asset_id,))
        conn.commit()


# ─── CLIENTI ─────────────────────────────────────────────────────────────────

def get_clienti():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM clienti ORDER BY nome, cognome", conn)

def add_cliente(nome, cognome, azienda='', email='', p_iva='', sdi='', cf='', indirizzo='', note=''):
    with get_db_connection() as conn:
        cur = conn.execute(
            "INSERT INTO clienti (nome, cognome, azienda, email, p_iva, sdi, cf, indirizzo, note) VALUES (?,?,?,?,?,?,?,?,?)",
            (nome, cognome, azienda, email, p_iva, sdi, cf, indirizzo, note)
        )
        conn.commit()
        return cur.lastrowid

def update_cliente(cliente_id, nome, cognome, azienda='', email='', p_iva='', sdi='', cf='', indirizzo='', note=''):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE clienti SET nome=?, cognome=?, azienda=?, email=?, p_iva=?, sdi=?, cf=?, indirizzo=?, note=? WHERE id=?",
            (nome, cognome, azienda, email, p_iva, sdi, cf, indirizzo, note, cliente_id)
        )
        conn.commit()

def delete_cliente(cliente_id):
    with get_db_connection() as conn:
        # Pone cliente_id a NULL nei progetti
        conn.execute("UPDATE progetti SET cliente_id=NULL WHERE cliente_id=?", (cliente_id,))
        conn.execute("DELETE FROM clienti WHERE id=?", (cliente_id,))
        conn.commit()

# ─── FORNITORI ───────────────────────────────────────────────────────────────

def get_fornitori():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM fornitori ORDER BY ragione_sociale", conn)

def add_fornitore(ragione_sociale, p_iva='', sdi='', referente='', email='', telefono='', indirizzo='', citta='', cap='', provincia='', categoria='', note=''):
    with get_db_connection() as conn:
        cur = conn.execute(
            "INSERT INTO fornitori (ragione_sociale, p_iva, sdi, referente, email, telefono, indirizzo, citta, cap, provincia, categoria, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (ragione_sociale, p_iva, sdi, referente, email, telefono, indirizzo, citta, cap, provincia, categoria, note)
        )
        conn.commit()
        return cur.lastrowid

def update_fornitore(fornitore_id, ragione_sociale, p_iva='', sdi='', referente='', email='', telefono='', indirizzo='', citta='', cap='', provincia='', categoria='', note=''):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE fornitori SET ragione_sociale=?, p_iva=?, sdi=?, referente=?, email=?, telefono=?, indirizzo=?, citta=?, cap=?, provincia=?, categoria=?, note=? WHERE id=?",
            (ragione_sociale, p_iva, sdi, referente, email, telefono, indirizzo, citta, cap, provincia, categoria, note, fornitore_id)
        )
        conn.commit()

def delete_fornitore(fornitore_id):
    with get_db_connection() as conn:
        # Pone fornitore_id a NULL in magazzino e spese_una_tantum
        conn.execute("UPDATE magazzino SET fornitore_id=NULL WHERE fornitore_id=?", (fornitore_id,))
        conn.execute("UPDATE spese_una_tantum SET fornitore_id=NULL WHERE fornitore_id=?", (fornitore_id,))
        conn.execute("DELETE FROM fornitori WHERE id=?", (fornitore_id,))
        conn.commit()
