from __future__ import annotations

from backend.repositories.base import dataframe_to_records, first_record
import database as db


def list_eventi(anno: int = None, mese: int = None, categoria: str = None) -> list[dict]:
    return dataframe_to_records(db.get_piano_eventi(anno=anno, mese=mese, categoria=categoria))


def get_evento(evento_id: int) -> dict | None:
    return first_record(db.get_piano_evento(evento_id))


def create_evento(
    cliente_id, progetto_id, titolo, start_at, end_at,
    durata_prevista_minuti, file_path, file_name, note, stato,
    categoria='stampe', printer_id=None,
) -> dict | None:
    new_id = db.add_piano_evento(
        cliente_id=cliente_id,
        progetto_id=progetto_id,
        titolo=titolo,
        start_at=start_at,
        end_at=end_at,
        durata_prevista_minuti=durata_prevista_minuti,
        file_path=file_path,
        file_name=file_name,
        note=note,
        stato=stato,
        categoria=categoria,
        printer_id=printer_id,
    )
    return get_evento(new_id)


def update_evento(
    evento_id, cliente_id, progetto_id, titolo, start_at, end_at,
    durata_prevista_minuti, file_path, file_name, note, stato,
    categoria='stampe', printer_id=None,
) -> dict | None:
    db.update_piano_evento(
        evento_id=evento_id,
        cliente_id=cliente_id,
        progetto_id=progetto_id,
        titolo=titolo,
        start_at=start_at,
        end_at=end_at,
        durata_prevista_minuti=durata_prevista_minuti,
        file_path=file_path,
        file_name=file_name,
        note=note,
        stato=stato,
        categoria=categoria,
        printer_id=printer_id,
    )
    return get_evento(evento_id)


def delete_evento(evento_id: int) -> None:
    db.delete_piano_evento(evento_id)
