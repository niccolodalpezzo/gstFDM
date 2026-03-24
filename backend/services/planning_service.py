from __future__ import annotations

import os
import uuid
from fastapi import UploadFile

from backend.repositories import planning

UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "uploads", "pianificazione"
)


def _ensure_uploads_dir() -> None:
    os.makedirs(UPLOADS_DIR, exist_ok=True)


async def _save_file(file: UploadFile) -> tuple[str, str]:
    """Salva il file e ritorna (file_path, file_name)."""
    _ensure_uploads_dir()
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOADS_DIR, unique_name)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return dest, file.filename or unique_name


def _delete_file(file_path: str | None) -> None:
    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass


def list_eventi(anno: int = None, mese: int = None, categoria: str = None) -> list[dict]:
    return planning.list_eventi(anno=anno, mese=mese, categoria=categoria)


def get_evento(evento_id: int) -> dict | None:
    return planning.get_evento(evento_id)


async def create_evento(
    titolo: str,
    start_at: str,
    end_at: str | None,
    cliente_id: int | None,
    progetto_id: int | None,
    printer_id: int | None,
    durata_prevista_minuti: int | None,
    note: str,
    stato: str,
    categoria: str,
    file: UploadFile | None,
) -> dict | None:
    file_path = None
    file_name = None
    if file and file.filename:
        file_path, file_name = await _save_file(file)

    return planning.create_evento(
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


async def update_evento(
    evento_id: int,
    titolo: str,
    start_at: str,
    end_at: str | None,
    cliente_id: int | None,
    progetto_id: int | None,
    printer_id: int | None,
    durata_prevista_minuti: int | None,
    note: str,
    stato: str,
    categoria: str,
    file: UploadFile | None,
) -> dict | None:
    existing = planning.get_evento(evento_id)
    if existing is None:
        return None

    file_path = existing.get("file_path")
    file_name = existing.get("file_name")

    if file and file.filename:
        _delete_file(file_path)
        file_path, file_name = await _save_file(file)

    return planning.update_evento(
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


def delete_evento(evento_id: int) -> None:
    existing = planning.get_evento(evento_id)
    if existing:
        _delete_file(existing.get("file_path"))
    planning.delete_evento(evento_id)
