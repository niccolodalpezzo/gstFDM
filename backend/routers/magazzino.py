from typing import List

from fastapi import APIRouter, HTTPException

from backend.repositories import inventory
from backend.schemas import GrossWeightUpdate, MagazzinoCreate, MagazzinoOut, MagazzinoUpdate

router = APIRouter()


@router.get("", response_model=List[MagazzinoOut])
def list_magazzino():
    return inventory.list_spools()


@router.post("", response_model=MagazzinoOut, status_code=201)
def create_magazzino(body: MagazzinoCreate):
    spool = inventory.create_spool(body)
    if spool is None:
        raise HTTPException(status_code=500, detail="Creazione bobina fallita")
    return spool


@router.put("/{magazzino_id}", response_model=MagazzinoOut)
def update_magazzino(magazzino_id: int, body: MagazzinoUpdate):
    if inventory.get_spool(magazzino_id) is None:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    spool = inventory.update_spool(magazzino_id, body)
    if spool is None:
        raise HTTPException(status_code=500, detail="Aggiornamento bobina fallito")
    return spool


@router.patch("/{magazzino_id}/gross-weight", response_model=MagazzinoOut)
def update_gross_weight(magazzino_id: int, body: GrossWeightUpdate):
    if inventory.get_spool(magazzino_id) is None:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    spool = inventory.update_spool_gross_weight(magazzino_id, body.gross_weight, body.grammi_residui)
    if spool is None:
        raise HTTPException(status_code=500, detail="Aggiornamento peso bobina fallito")
    return spool


@router.delete("/{magazzino_id}", status_code=204)
def delete_magazzino(magazzino_id: int):
    inventory.delete_spool(magazzino_id)


@router.post("/{magazzino_id}/attiva")
def attiva_bobina(magazzino_id: int):
    codice = inventory.activate_spool(magazzino_id)
    if not codice:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    return {"codice": codice}


@router.get("/by-codice/{codice}", response_model=MagazzinoOut)
def get_by_codice(codice: str):
    spool = inventory.get_spool_by_code(codice)
    if not spool:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    return spool
