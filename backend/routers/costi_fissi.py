from typing import List

from fastapi import APIRouter, HTTPException

from backend.repositories import finance
from backend.schemas import CostoFissoCreate, CostoFissoOut

router = APIRouter()


@router.get("", response_model=List[CostoFissoOut])
def list_costi_fissi():
    return finance.list_fixed_costs()


@router.post("", response_model=CostoFissoOut, status_code=201)
def create_costo_fisso(body: CostoFissoCreate):
    fixed_cost = finance.create_fixed_cost(body)
    if fixed_cost is None:
        raise HTTPException(status_code=500, detail="Creazione costo fisso fallita")
    return fixed_cost


@router.patch("/{costo_id}/toggle", response_model=CostoFissoOut)
def toggle_costo(costo_id: int, body: dict):
    attivo = body.get("attivo")
    if attivo is None:
        raise HTTPException(status_code=422, detail="Campo 'attivo' obbligatorio")
    if finance.get_fixed_cost(costo_id) is None:
        raise HTTPException(status_code=404, detail="Costo fisso non trovato")
    fixed_cost = finance.toggle_fixed_cost(costo_id, attivo)
    if fixed_cost is None:
        raise HTTPException(status_code=500, detail="Aggiornamento costo fisso fallito")
    return fixed_cost


@router.delete("/{costo_id}", status_code=204)
def delete_costo(costo_id: int):
    finance.delete_fixed_cost(costo_id)
