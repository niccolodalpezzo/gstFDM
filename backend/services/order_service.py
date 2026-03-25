from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import UploadFile

import database as db

UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "uploads", "ordini"
)

VALID_ORDER_TRANSITIONS = {
    "nuovo": ["in_lavorazione", "chiuso"],
    "in_lavorazione": ["completato", "chiuso"],
    "completato": ["spedito", "chiuso"],
    "spedito": ["chiuso"],
    "chiuso": [],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_uploads_dir(ordine_id: int) -> str:
    d = os.path.join(UPLOADS_DIR, str(ordine_id))
    os.makedirs(d, exist_ok=True)
    return d


def _generate_numero_ordine(conn) -> str:
    anno = datetime.now().strftime("%Y")
    prefix = f"ORD-{anno}-"
    row = conn.execute(
        "SELECT COUNT(*) AS total FROM ordini WHERE numero_ordine LIKE ?",
        (f"{prefix}%",),
    ).fetchone()
    next_number = int((row["total"] if row else 0) or 0) + 1
    return f"{prefix}{next_number:04d}"


def _printer_label(conn, stampante_id: int | None) -> str | None:
    if stampante_id is None:
        return None
    row = conn.execute(
        "SELECT asset_name, marca, modello FROM stampanti WHERE id = ?",
        (stampante_id,),
    ).fetchone()
    if not row:
        return None
    label = (row["asset_name"] or "").strip()
    if label:
        return label
    return f"{row['marca'] or ''} {row['modello'] or ''}".strip()


def _materiale_label(conn, magazzino_id: int | None) -> str | None:
    if magazzino_id is None:
        return None
    row = conn.execute(
        "SELECT materiale, colore FROM magazzino WHERE id = ?",
        (magazzino_id,),
    ).fetchone()
    if not row:
        return None
    return f"{row['materiale']} {row['colore']}".strip()


def _format_order_list_item(row, conn) -> dict[str, Any]:
    ordine_id = row["id"]
    n_files = conn.execute(
        "SELECT COUNT(*) AS cnt FROM ordine_file WHERE ordine_id = ?",
        (ordine_id,),
    ).fetchone()["cnt"]
    jobs_row = conn.execute(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) AS done FROM job_lavorazioni WHERE ordine_id = ?",
        (ordine_id,),
    ).fetchone()
    return {
        **dict(row),
        "n_files": n_files,
        "n_jobs": jobs_row["total"] or 0,
        "n_jobs_completati": jobs_row["done"] or 0,
    }


def _format_order_detail(conn, ordine_id: int) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
    if row is None:
        raise LookupError("Ordine non trovato.")
    base = _format_order_list_item(row, conn)

    files = []
    for f in conn.execute(
        "SELECT * FROM ordine_file WHERE ordine_id = ? ORDER BY id ASC",
        (ordine_id,),
    ).fetchall():
        fd = dict(f)
        fd["stampante_nome"] = _printer_label(conn, fd.get("stampante_id"))
        fd["materiale_nome"] = _materiale_label(conn, fd.get("materiale_magazzino_id"))
        fd["jobs_count"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM job_lavorazioni WHERE ordine_file_id = ?",
            (fd["id"],),
        ).fetchone()["cnt"]
        files.append(fd)

    jobs = []
    for j in conn.execute(
        "SELECT * FROM job_lavorazioni WHERE ordine_id = ? ORDER BY id ASC",
        (ordine_id,),
    ).fetchall():
        jd = dict(j)
        jd["stampante_nome"] = _printer_label(conn, jd.get("stampante_id"))
        jd["materiale_nome"] = _materiale_label(conn, jd.get("materiale_magazzino_id"))
        file_row = conn.execute(
            "SELECT file_name FROM ordine_file WHERE id = ?",
            (jd.get("ordine_file_id"),),
        ).fetchone()
        jd["file_name"] = file_row["file_name"] if file_row else None
        jd["ordine_numero"] = base.get("numero_ordine")
        jobs.append(jd)

    spedizioni = [
        dict(s)
        for s in conn.execute(
            "SELECT * FROM spedizioni WHERE ordine_id = ? ORDER BY id ASC",
            (ordine_id,),
        ).fetchall()
    ]
    for s in spedizioni:
        s["ordine_numero"] = base.get("numero_ordine")

    base["files"] = files
    base["jobs"] = jobs
    base["spedizioni"] = spedizioni
    return base


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def create_order_from_quote(preventivo_id: int) -> dict[str, Any]:
    """Crea un ordine a partire da un preventivo convertito."""
    with db.get_db_connection() as conn:
        prev = conn.execute(
            "SELECT * FROM preventivi WHERE id = ?",
            (preventivo_id,),
        ).fetchone()
        if prev is None:
            raise LookupError("Preventivo non trovato.")

        now = _now_iso()
        numero_ordine = _generate_numero_ordine(conn)

        conn.execute(
            """INSERT INTO ordini
               (numero_ordine, preventivo_id, cliente_id, cliente_nome_snapshot,
                progetto_nome, stato, prezzo_finale, costo_pieno, utile_lordo,
                margine_lordo_perc, quantita, snapshot_preventivo_json, note,
                data_creazione, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                numero_ordine,
                preventivo_id,
                prev["cliente_id"],
                prev["cliente_nome_snapshot"],
                prev["progetto_nome"],
                "nuovo",
                float(prev["prezzo_finale"] or 0),
                float(prev["costo_pieno"] or 0),
                float(prev["utile_lordo"] or 0),
                float(prev["margine_lordo_perc"] or 0),
                int(prev["quantita"] or 1),
                prev["snapshot_json"] or "{}",
                prev["note"] or "",
                now,
                now,
                now,
            ),
        )
        ordine_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            "UPDATE preventivi SET ordine_id = ? WHERE id = ?",
            (ordine_id, preventivo_id),
        )
        conn.commit()
        return _format_order_detail(conn, ordine_id)


def list_orders(stato: str | None = None, cliente_id: int | None = None) -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        sql = "SELECT * FROM ordini WHERE 1=1"
        params: list = []
        if stato:
            sql += " AND stato = ?"
            params.append(stato)
        if cliente_id is not None:
            sql += " AND cliente_id = ?"
            params.append(cliente_id)
        sql += " ORDER BY created_at DESC, id DESC"
        rows = conn.execute(sql, params).fetchall()
        return [_format_order_list_item(r, conn) for r in rows]


def get_order(ordine_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        return _format_order_detail(conn, ordine_id)


def update_order(ordine_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        existing = conn.execute("SELECT * FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
        if existing is None:
            raise LookupError("Ordine non trovato.")
        now = _now_iso()
        conn.execute(
            "UPDATE ordini SET note = ?, updated_at = ? WHERE id = ?",
            (data.get("note", existing["note"]), now, ordine_id),
        )
        conn.commit()
        return _format_order_detail(conn, ordine_id)


def delete_order(ordine_id: int) -> None:
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM spedizioni WHERE ordine_id = ?", (ordine_id,))
        conn.execute("DELETE FROM job_lavorazioni WHERE ordine_id = ?", (ordine_id,))
        # Delete uploaded files from disk
        files = conn.execute(
            "SELECT file_path FROM ordine_file WHERE ordine_id = ?",
            (ordine_id,),
        ).fetchall()
        for f in files:
            if f["file_path"] and os.path.isfile(f["file_path"]):
                try:
                    os.remove(f["file_path"])
                except OSError:
                    pass
        conn.execute("DELETE FROM ordine_file WHERE ordine_id = ?", (ordine_id,))
        conn.execute("DELETE FROM ordini WHERE id = ?", (ordine_id,))
        conn.commit()


def transition_order(ordine_id: int, new_stato: str) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT stato FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
        if row is None:
            raise LookupError("Ordine non trovato.")
        current = row["stato"]
        allowed = VALID_ORDER_TRANSITIONS.get(current, [])
        if new_stato not in allowed:
            raise ValueError(
                f"Transizione non consentita: da '{current}' a '{new_stato}'. "
                f"Transizioni possibili: {', '.join(allowed) if allowed else 'nessuna'}."
            )
        now = _now_iso()
        date_field = {
            "completato": "data_completamento",
            "spedito": "data_spedizione",
            "chiuso": "data_chiusura",
        }.get(new_stato)
        if date_field:
            conn.execute(
                f"UPDATE ordini SET stato = ?, {date_field} = ?, updated_at = ? WHERE id = ?",
                (new_stato, now, now, ordine_id),
            )
        else:
            conn.execute(
                "UPDATE ordini SET stato = ?, updated_at = ? WHERE id = ?",
                (new_stato, now, ordine_id),
            )
        conn.commit()
        return _format_order_detail(conn, ordine_id)


# ─── FILE MANAGEMENT ──────────────────────────────────────────────────────────

async def add_file_to_order(ordine_id: int, file: UploadFile, metadata: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        existing = conn.execute("SELECT id FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
        if existing is None:
            raise LookupError("Ordine non trovato.")

    upload_dir = _ensure_uploads_dir(ordine_id)
    ext = os.path.splitext(file.filename or "")[1] or ".3mf"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(upload_dir, unique_name)
    content = await file.read()
    file_size = len(content)
    with open(dest, "wb") as f:
        f.write(content)

    now = _now_iso()
    with db.get_db_connection() as conn:
        conn.execute(
            """INSERT INTO ordine_file
               (ordine_id, file_path, file_name, file_size, stampante_id,
                materiale_magazzino_id, tempo_stimato_minuti, quantita, note, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                ordine_id,
                dest,
                file.filename or unique_name,
                file_size,
                metadata.get("stampante_id"),
                metadata.get("materiale_magazzino_id"),
                float(metadata.get("tempo_stimato_minuti", 0)),
                int(metadata.get("quantita", 1)),
                metadata.get("note", ""),
                now,
            ),
        )
        conn.commit()
        return _format_order_detail(conn, ordine_id)


def update_order_file(ordine_id: int, file_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM ordine_file WHERE id = ? AND ordine_id = ?",
            (file_id, ordine_id),
        ).fetchone()
        if existing is None:
            raise LookupError("File non trovato in questo ordine.")
        conn.execute(
            """UPDATE ordine_file SET
               stampante_id = ?, materiale_magazzino_id = ?,
               tempo_stimato_minuti = ?, quantita = ?, note = ?
               WHERE id = ?""",
            (
                data.get("stampante_id"),
                data.get("materiale_magazzino_id"),
                float(data.get("tempo_stimato_minuti", 0)),
                int(data.get("quantita", 1)),
                data.get("note", ""),
                file_id,
            ),
        )
        conn.commit()
        return _format_order_detail(conn, ordine_id)


def delete_order_file(ordine_id: int, file_id: int) -> None:
    with db.get_db_connection() as conn:
        row = conn.execute(
            "SELECT file_path FROM ordine_file WHERE id = ? AND ordine_id = ?",
            (file_id, ordine_id),
        ).fetchone()
        if row is None:
            raise LookupError("File non trovato in questo ordine.")
        if row["file_path"] and os.path.isfile(row["file_path"]):
            try:
                os.remove(row["file_path"])
            except OSError:
                pass
        conn.execute("DELETE FROM job_lavorazioni WHERE ordine_file_id = ?", (file_id,))
        conn.execute("DELETE FROM ordine_file WHERE id = ?", (file_id,))
        conn.commit()


def get_file_path(ordine_id: int, file_id: int) -> str:
    with db.get_db_connection() as conn:
        row = conn.execute(
            "SELECT file_path, file_name FROM ordine_file WHERE id = ? AND ordine_id = ?",
            (file_id, ordine_id),
        ).fetchone()
        if row is None:
            raise LookupError("File non trovato.")
        return row["file_path"]
