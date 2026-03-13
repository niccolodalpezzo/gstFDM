from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import CostoFissoCreate, CostoFissoOut
import database as db

router = APIRouter()


@router.get("", response_model=List[CostoFissoOut])
def list_costi_fissi():
    df = db.get_costi_fissi()
    records = df.to_dict("records")
    for r in records:
        r["attivo"] = bool(r["attivo"])
    return records


@router.post("", response_model=CostoFissoOut, status_code=201)
def create_costo_fisso(body: CostoFissoCreate):
    db.add_costo_fisso(body.nome, body.importo_mensile, body.attivo)
    df = db.get_costi_fissi()
    row = df.iloc[-1].to_dict()
    row["attivo"] = bool(row["attivo"])
    return row


@router.patch("/{costo_id}/toggle", response_model=CostoFissoOut)
def toggle_costo(costo_id: int, body: dict):
    attivo = body.get("attivo")
    if attivo is None:
        raise HTTPException(status_code=422, detail="Campo 'attivo' obbligatorio")
    db.toggle_costo_fisso(costo_id, attivo)
    df = db.get_costi_fissi()
    rows = df[df["id"] == costo_id]
    if rows.empty:
        raise HTTPException(status_code=404, detail="Costo fisso non trovato")
    row = rows.iloc[0].to_dict()
    row["attivo"] = bool(row["attivo"])
    return row


@router.delete("/{costo_id}", status_code=204)
def delete_costo(costo_id: int):
    db.delete_costo_fisso(costo_id)
