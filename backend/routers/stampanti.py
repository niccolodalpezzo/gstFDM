from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import StampanteCreate, StampanteOut
import database as db

router = APIRouter()


@router.get("", response_model=List[StampanteOut])
def list_stampanti():
    df = db.get_stampanti()
    return df.to_dict("records")


@router.post("", response_model=StampanteOut, status_code=201)
def create_stampante(body: StampanteCreate):
    db.add_stampante(
        body.marca, body.modello, body.diametro_ugello,
        body.consumo_w, body.costo_acquisto, body.ammortamento_orario
    )
    row = db.get_stampanti().iloc[-1].to_dict()
    return row


@router.put("/{stampante_id}", response_model=StampanteOut)
def update_stampante(stampante_id: int, body: StampanteCreate):
    df = db.get_stampanti()
    if df[df["id"] == stampante_id].empty:
        raise HTTPException(status_code=404, detail="Stampante non trovata")
    db.update_stampante(
        stampante_id, body.marca, body.modello, body.diametro_ugello,
        body.consumo_w, body.costo_acquisto, body.ammortamento_orario
    )
    row = db.get_stampanti()
    return row[row["id"] == stampante_id].iloc[0].to_dict()


@router.delete("/{stampante_id}", status_code=204)
def delete_stampante(stampante_id: int):
    db.delete_stampante(stampante_id)
