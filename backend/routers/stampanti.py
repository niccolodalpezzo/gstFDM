from typing import List

from fastapi import APIRouter, HTTPException

from backend.schemas import StampanteCreate, StampanteOut, PrinterLiveStatus
from backend.services import printer_service

router = APIRouter()


@router.get("", response_model=List[StampanteOut])
def list_stampanti():
    return printer_service.list_printers()


@router.post("", response_model=StampanteOut, status_code=201)
def create_stampante(body: StampanteCreate):
    try:
        printer = printer_service.create_printer(body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if printer is None:
        raise HTTPException(status_code=500, detail="Creazione stampante fallita")
    return printer


@router.put("/{stampante_id}", response_model=StampanteOut)
def update_stampante(stampante_id: int, body: StampanteCreate):
    if printer_service.get_printer(stampante_id) is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    try:
        printer = printer_service.update_printer(stampante_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if printer is None:
        raise HTTPException(status_code=500, detail="Aggiornamento stampante fallito")
    return printer


@router.delete("/{stampante_id}", status_code=204)
def delete_stampante(stampante_id: int):
    printer_service.delete_printer(stampante_id)


@router.get("/{stampante_id}/live-status", response_model=PrinterLiveStatus)
def live_status(stampante_id: int):
    result = printer_service.get_live_status(stampante_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Stampante non trovata")
    return result
