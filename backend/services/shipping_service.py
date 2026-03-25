from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import database as db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_shipment(conn, row) -> dict[str, Any]:
    sd = dict(row)
    ordine = conn.execute(
        "SELECT numero_ordine, cliente_nome_snapshot FROM ordini WHERE id = ?",
        (sd["ordine_id"],),
    ).fetchone()
    sd["ordine_numero"] = ordine["numero_ordine"] if ordine else None
    sd["cliente_nome"] = ordine["cliente_nome_snapshot"] if ordine else None
    return sd


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def create_shipment(data: dict[str, Any]) -> dict[str, Any]:
    ordine_id = data["ordine_id"]
    with db.get_db_connection() as conn:
        ordine = conn.execute("SELECT id FROM ordini WHERE id = ?", (ordine_id,)).fetchone()
        if ordine is None:
            raise LookupError("Ordine non trovato.")
        now = _now_iso()
        conn.execute(
            """INSERT INTO spedizioni
               (ordine_id, corriere, costo_spedizione, costo_packing,
                peso_kg, indirizzo_destinazione, note, stato, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                ordine_id,
                data.get("corriere", ""),
                float(data.get("costo_spedizione", 0)),
                float(data.get("costo_packing", 0)),
                float(data.get("peso_kg", 0)),
                data.get("indirizzo_destinazione", ""),
                data.get("note", ""),
                "preparazione",
                now,
                now,
            ),
        )
        spedizione_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
        row = conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone()
        return _format_shipment(conn, row)


def list_shipments(ordine_id: int | None = None) -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        if ordine_id is not None:
            rows = conn.execute(
                "SELECT * FROM spedizioni WHERE ordine_id = ? ORDER BY created_at DESC",
                (ordine_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM spedizioni ORDER BY created_at DESC"
            ).fetchall()
        return [_format_shipment(conn, r) for r in rows]


def get_shipment(spedizione_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone()
        if row is None:
            raise LookupError("Spedizione non trovata.")
        return _format_shipment(conn, row)


def update_shipment(spedizione_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone()
        if row is None:
            raise LookupError("Spedizione non trovata.")
        now = _now_iso()
        conn.execute(
            """UPDATE spedizioni SET
               corriere = ?, codice_tracking = ?, costo_spedizione = ?,
               costo_packing = ?, peso_kg = ?, indirizzo_destinazione = ?,
               note = ?, updated_at = ?
               WHERE id = ?""",
            (
                data.get("corriere", row["corriere"]),
                data.get("codice_tracking", row["codice_tracking"]),
                float(data.get("costo_spedizione", row["costo_spedizione"])),
                float(data.get("costo_packing", row["costo_packing"])),
                float(data.get("peso_kg", row["peso_kg"])),
                data.get("indirizzo_destinazione", row["indirizzo_destinazione"]),
                data.get("note", row["note"]),
                now,
                spedizione_id,
            ),
        )
        conn.commit()
        return _format_shipment(
            conn,
            conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone(),
        )


def mark_shipped(spedizione_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone()
        if row is None:
            raise LookupError("Spedizione non trovata.")
        if row["stato"] != "preparazione":
            raise ValueError("Solo le spedizioni in preparazione possono essere segnate come spedite.")
        now = _now_iso()
        conn.execute(
            """UPDATE spedizioni SET
               stato = 'spedito', codice_tracking = ?, corriere = ?,
               data_spedizione = ?, updated_at = ?
               WHERE id = ?""",
            (
                data.get("codice_tracking", row["codice_tracking"]),
                data.get("corriere", row["corriere"]),
                now,
                now,
                spedizione_id,
            ),
        )
        # Auto-transition ordine → spedito
        ordine = conn.execute(
            "SELECT stato FROM ordini WHERE id = ?",
            (row["ordine_id"],),
        ).fetchone()
        if ordine and ordine["stato"] == "completato":
            conn.execute(
                "UPDATE ordini SET stato = 'spedito', data_spedizione = ?, updated_at = ? WHERE id = ?",
                (now, now, row["ordine_id"]),
            )
        conn.commit()
        return _format_shipment(
            conn,
            conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone(),
        )


def mark_delivered(spedizione_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone()
        if row is None:
            raise LookupError("Spedizione non trovata.")
        if row["stato"] != "spedito":
            raise ValueError("Solo le spedizioni spedite possono essere segnate come consegnate.")
        now = _now_iso()
        conn.execute(
            "UPDATE spedizioni SET stato = 'consegnato', data_consegna = ?, updated_at = ? WHERE id = ?",
            (now, now, spedizione_id),
        )
        conn.commit()
        return _format_shipment(
            conn,
            conn.execute("SELECT * FROM spedizioni WHERE id = ?", (spedizione_id,)).fetchone(),
        )


def delete_shipment(spedizione_id: int) -> None:
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM spedizioni WHERE id = ?", (spedizione_id,))
        conn.commit()
