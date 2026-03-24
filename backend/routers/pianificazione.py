from typing import List, Optional

from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from fastapi.responses import FileResponse

from backend.schemas import PianificazioneOut
from backend.services import planning_service
import os

router = APIRouter()

STATI_VALIDI = {"Pianificato", "In corso", "Completato", "Annullato"}
CATEGORIE_VALIDE = {"stampe", "manutenzione", "appuntamenti"}


@router.get("", response_model=List[PianificazioneOut])
def list_eventi(
    anno: Optional[int] = None,
    mese: Optional[int] = None,
    categoria: Optional[str] = None,
):
    return planning_service.list_eventi(anno=anno, mese=mese, categoria=categoria)


@router.get("/{evento_id}", response_model=PianificazioneOut)
def get_evento(evento_id: int):
    evento = planning_service.get_evento(evento_id)
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    return evento


@router.post("", response_model=PianificazioneOut, status_code=201)
async def create_evento(
    titolo: str = Form(...),
    start_at: str = Form(...),
    end_at: Optional[str] = Form(None),
    cliente_id: Optional[int] = Form(None),
    progetto_id: Optional[int] = Form(None),
    printer_id: Optional[int] = Form(None),
    durata_prevista_minuti: Optional[int] = Form(None),
    note: str = Form(""),
    stato: str = Form("Pianificato"),
    categoria: str = Form("stampe"),
    file: Optional[UploadFile] = File(None),
):
    if stato not in STATI_VALIDI:
        raise HTTPException(status_code=422, detail=f"Stato non valido: {stato}")
    if categoria not in CATEGORIE_VALIDE:
        raise HTTPException(status_code=422, detail=f"Categoria non valida: {categoria}")
    evento = await planning_service.create_evento(
        titolo=titolo, start_at=start_at, end_at=end_at or None,
        cliente_id=cliente_id, progetto_id=progetto_id, printer_id=printer_id,
        durata_prevista_minuti=durata_prevista_minuti,
        note=note, stato=stato, categoria=categoria, file=file,
    )
    if evento is None:
        raise HTTPException(status_code=500, detail="Creazione evento fallita")
    return evento


@router.put("/{evento_id}", response_model=PianificazioneOut)
async def update_evento(
    evento_id: int,
    titolo: str = Form(...),
    start_at: str = Form(...),
    end_at: Optional[str] = Form(None),
    cliente_id: Optional[int] = Form(None),
    progetto_id: Optional[int] = Form(None),
    printer_id: Optional[int] = Form(None),
    durata_prevista_minuti: Optional[int] = Form(None),
    note: str = Form(""),
    stato: str = Form("Pianificato"),
    categoria: str = Form("stampe"),
    file: Optional[UploadFile] = File(None),
):
    if stato not in STATI_VALIDI:
        raise HTTPException(status_code=422, detail=f"Stato non valido: {stato}")
    if categoria not in CATEGORIE_VALIDE:
        raise HTTPException(status_code=422, detail=f"Categoria non valida: {categoria}")
    evento = await planning_service.update_evento(
        evento_id=evento_id, titolo=titolo, start_at=start_at, end_at=end_at or None,
        cliente_id=cliente_id, progetto_id=progetto_id, printer_id=printer_id,
        durata_prevista_minuti=durata_prevista_minuti,
        note=note, stato=stato, categoria=categoria, file=file,
    )
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    return evento


@router.delete("/{evento_id}", status_code=204)
def delete_evento(evento_id: int):
    planning_service.delete_evento(evento_id)


@router.get("/{evento_id}/file")
def download_file(evento_id: int):
    evento = planning_service.get_evento(evento_id)
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    file_path = evento.get("file_path")
    file_name = evento.get("file_name") or "file"
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(path=file_path, filename=file_name)
