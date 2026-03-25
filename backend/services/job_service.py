from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import database as db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    return label if label else f"{row['marca'] or ''} {row['modello'] or ''}".strip()


def _materiale_label(conn, magazzino_id: int | None) -> str | None:
    if magazzino_id is None:
        return None
    row = conn.execute(
        "SELECT materiale, colore FROM magazzino WHERE id = ?",
        (magazzino_id,),
    ).fetchone()
    return f"{row['materiale']} {row['colore']}".strip() if row else None


def _generate_numero_job(conn) -> str:
    anno = datetime.now().strftime("%Y")
    prefix = f"JOB-{anno}-"
    row = conn.execute(
        "SELECT COUNT(*) AS total FROM job_lavorazioni WHERE numero_job LIKE ?",
        (f"{prefix}%",),
    ).fetchone()
    next_number = int((row["total"] if row else 0) or 0) + 1
    return f"{prefix}{next_number:04d}"


def _format_job(conn, job_row) -> dict[str, Any]:
    jd = dict(job_row)
    jd["stampante_nome"] = _printer_label(conn, jd.get("stampante_id"))
    jd["materiale_nome"] = _materiale_label(conn, jd.get("materiale_magazzino_id"))
    file_row = conn.execute(
        "SELECT file_name FROM ordine_file WHERE id = ?",
        (jd.get("ordine_file_id"),),
    ).fetchone()
    jd["file_name"] = file_row["file_name"] if file_row else None
    ordine_row = conn.execute(
        "SELECT numero_ordine FROM ordini WHERE id = ?",
        (jd.get("ordine_id"),),
    ).fetchone()
    jd["ordine_numero"] = ordine_row["numero_ordine"] if ordine_row else None
    return jd


def _auto_update_order_state(conn, ordine_id: int) -> None:
    """Aggiorna automaticamente lo stato dell'ordine in base ai job."""
    ordine = conn.execute("SELECT stato FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
    if ordine is None:
        return
    current = ordine["stato"]

    jobs = conn.execute(
        "SELECT stato FROM job_lavorazioni WHERE ordine_id = ?",
        (ordine_id,),
    ).fetchall()
    if not jobs:
        return

    stati = [j["stato"] for j in jobs]
    now = _now_iso()

    if current == "nuovo" and any(s == "in_corso" for s in stati):
        conn.execute(
            "UPDATE ordini SET stato = 'in_lavorazione', updated_at = ? WHERE id = ?",
            (now, ordine_id),
        )
    elif current == "in_lavorazione":
        active = [s for s in stati if s not in ("completato", "annullato")]
        if not active:
            conn.execute(
                "UPDATE ordini SET stato = 'completato', data_completamento = ?, updated_at = ? WHERE id = ?",
                (now, now, ordine_id),
            )


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def generate_jobs_from_file(ordine_id: int, ordine_file_id: int) -> list[dict[str, Any]]:
    """Genera job dal file ordine. Crea N job dove N = quantita del file."""
    with db.get_db_connection() as conn:
        file_row = conn.execute(
            "SELECT * FROM ordine_file WHERE id = ? AND ordine_id = ?",
            (ordine_file_id, ordine_id),
        ).fetchone()
        if file_row is None:
            raise LookupError("File non trovato in questo ordine.")
        if file_row["stampante_id"] is None:
            raise ValueError("Assegna una stampante al file prima di generare i job.")

        now = _now_iso()
        quantita = int(file_row["quantita"] or 1)
        created_jobs = []

        for _ in range(quantita):
            numero_job = _generate_numero_job(conn)
            conn.execute(
                """INSERT INTO job_lavorazioni
                   (numero_job, ordine_id, ordine_file_id, stampante_id,
                    materiale_magazzino_id, quantita, tempo_stimato_minuti,
                    stato, note, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    numero_job,
                    ordine_id,
                    ordine_file_id,
                    file_row["stampante_id"],
                    file_row["materiale_magazzino_id"],
                    1,
                    float(file_row["tempo_stimato_minuti"] or 0),
                    "pianificato",
                    "",
                    now,
                    now,
                ),
            )
            job_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            job_row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
            created_jobs.append(_format_job(conn, job_row))

        conn.commit()
        return created_jobs


def list_jobs(
    ordine_id: int | None = None,
    stampante_id: int | None = None,
    stato: str | None = None,
) -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        sql = "SELECT * FROM job_lavorazioni WHERE 1=1"
        params: list = []
        if ordine_id is not None:
            sql += " AND ordine_id = ?"
            params.append(ordine_id)
        if stampante_id is not None:
            sql += " AND stampante_id = ?"
            params.append(stampante_id)
        if stato:
            sql += " AND stato = ?"
            params.append(stato)
        sql += " ORDER BY created_at DESC, id DESC"
        return [_format_job(conn, r) for r in conn.execute(sql, params).fetchall()]


def get_job(job_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise LookupError("Job non trovato.")
        return _format_job(conn, row)


def update_job(job_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise LookupError("Job non trovato.")
        now = _now_iso()
        conn.execute(
            "UPDATE job_lavorazioni SET note = ?, updated_at = ? WHERE id = ?",
            (data.get("note", row["note"]), now, job_id),
        )
        conn.commit()
        return _format_job(conn, conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone())


def start_job(job_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise LookupError("Job non trovato.")
        if row["stato"] != "pianificato":
            raise ValueError("Solo i job pianificati possono essere avviati.")
        now = _now_iso()
        conn.execute(
            "UPDATE job_lavorazioni SET stato = 'in_corso', data_inizio = ?, updated_at = ? WHERE id = ?",
            (now, now, job_id),
        )
        _auto_update_order_state(conn, row["ordine_id"])
        conn.commit()
        return _format_job(conn, conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone())


def complete_job(job_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise LookupError("Job non trovato.")
        if row["stato"] not in ("pianificato", "in_corso"):
            raise ValueError("Solo i job pianificati o in corso possono essere completati.")
        now = _now_iso()
        conn.execute(
            """UPDATE job_lavorazioni SET
               stato = 'completato', data_fine = ?,
               tempo_effettivo_minuti = ?, grammi_effettivi = ?,
               note = ?, updated_at = ?
               WHERE id = ?""",
            (
                now,
                data.get("tempo_effettivo_minuti"),
                data.get("grammi_effettivi"),
                data.get("note", row["note"]),
                now,
                job_id,
            ),
        )
        _auto_update_order_state(conn, row["ordine_id"])
        conn.commit()
        return _format_job(conn, conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone())


def cancel_job(job_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise LookupError("Job non trovato.")
        if row["stato"] == "completato":
            raise ValueError("I job completati non possono essere annullati.")
        now = _now_iso()
        conn.execute(
            "UPDATE job_lavorazioni SET stato = 'annullato', updated_at = ? WHERE id = ?",
            (now, job_id),
        )
        _auto_update_order_state(conn, row["ordine_id"])
        conn.commit()
        return _format_job(conn, conn.execute("SELECT * FROM job_lavorazioni WHERE id = ?", (job_id,)).fetchone())
