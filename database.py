import os
import sqlite3
import random
import string
import pandas as pd
from contextlib import contextmanager

DB_PATH = os.path.join('data', 'printfarm.sqlite')

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
                budget REAL DEFAULT 0.0,
                stato TEXT DEFAULT 'Progettazione',
                quantita_da_produrre INTEGER DEFAULT 1,
                ore_progettazione REAL DEFAULT 0.0,
                costo_extra_progetto REAL DEFAULT 0.0
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
                codice_univoco TEXT DEFAULT NULL
            )
        ''')

        # Tabella Costi Fissi
        c.execute('''
            CREATE TABLE IF NOT EXISTS costi_fissi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                importo_mensile REAL NOT NULL,
                attivo BOOLEAN DEFAULT 1
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

        # Applica migrazioni per DB esistenti
        _migrate(c)
        conn.commit()


# ─── PROGETTI ────────────────────────────────────────────────────────────────

def get_progetti():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM progetti", conn)

def add_progetto(nome, cliente, budget, stato='Progettazione', quantita=1, ore_prog=0.0, costo_extra=0.0):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO progetti (nome, cliente, budget, stato, quantita_da_produrre, ore_progettazione, costo_extra_progetto) VALUES (?,?,?,?,?,?,?)",
            (nome, cliente, budget, stato, quantita, ore_prog, costo_extra)
        )
        conn.commit()

def update_progetto(progetto_id, nome, cliente, budget, stato, quantita, ore_prog, costo_extra):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE progetti SET nome=?, cliente=?, budget=?, stato=?, quantita_da_produrre=?, ore_progettazione=?, costo_extra_progetto=? WHERE id=?",
            (nome, cliente, budget, stato, quantita, ore_prog, costo_extra, progetto_id)
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
        return pd.read_sql_query("SELECT * FROM stampanti", conn)

def add_stampante(marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO stampanti (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario) VALUES (?,?,?,?,?,?)",
            (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario)
        )
        conn.commit()

def update_stampante(stampante_id, marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE stampanti SET marca=?, modello=?, diametro_ugello=?, consumo_w=?, costo_acquisto=?, ammortamento_orario=? WHERE id=?",
            (marca, modello, diametro_ugello, consumo_w, costo_acquisto, ammortamento_orario, stampante_id)
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

def add_magazzino(marca, materiale, colore, costo_kg, grammi_residui, stato='Nuova', quantita_stock=1):
    """Aggiunge una nuova bobina. Stato 'Nuova' ha un quantita_stock, le Usate un codice."""
    codice = None
    if stato == 'Usata':
        codice = _genera_codice_4()
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO magazzino (marca, materiale, colore, costo_kg, grammi_residui, stato, quantita_stock, codice_univoco) VALUES (?,?,?,?,?,?,?,?)",
            (marca, materiale, colore, costo_kg, grammi_residui, stato, quantita_stock, codice)
        )
        conn.commit()

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


# ─── COSTI FISSI ─────────────────────────────────────────────────────────────

def get_costi_fissi():
    with get_db_connection() as conn:
        return pd.read_sql_query("SELECT * FROM costi_fissi", conn)

def add_costo_fisso(nome, importo_mensile, attivo=True):
    with get_db_connection() as conn:
        conn.execute("INSERT INTO costi_fissi (nome, importo_mensile, attivo) VALUES (?,?,?)",
                     (nome, importo_mensile, attivo))
        conn.commit()

def toggle_costo_fisso(costo_id, attivo):
    with get_db_connection() as conn:
        conn.execute("UPDATE costi_fissi SET attivo=? WHERE id=?", (attivo, costo_id))
        conn.commit()

def delete_costo_fisso(costo_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM costi_fissi WHERE id=?", (costo_id,))
        conn.commit()


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
                   costo_post_prod=0.0, costo_extra=0.0, costo_packaging=0.0):
    with get_db_connection() as conn:
        conn.execute(
            """INSERT INTO log_stampe
               (progetto_id, stampante_id, magazzino_id, grammi_usati, tempo_minuti,
                costo_post_prod, costo_extra, costo_packaging)
               VALUES (?,?,?,?,?,?,?,?)""",
            (progetto_id, stampante_id, magazzino_id, grammi_usati, tempo_minuti,
             costo_post_prod, costo_extra, costo_packaging)
        )
        conn.commit()
