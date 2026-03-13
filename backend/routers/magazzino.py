from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import MagazzinoCreate, MagazzinoOut
import database as db

router = APIRouter()


@router.get("", response_model=List[MagazzinoOut])
def list_magazzino():
    df = db.get_magazzino()
    records = df.to_dict("records")
    # Normalizza NaN → None per codice_univoco
    for r in records:
        if r.get("codice_univoco") != r.get("codice_univoco"):  # NaN check
            r["codice_univoco"] = None
    return records


@router.post("", response_model=MagazzinoOut, status_code=201)
def create_magazzino(body: MagazzinoCreate):
    db.add_magazzino(
        body.marca, body.materiale, body.colore,
        body.costo_kg, body.grammi_residui, body.stato, body.quantita_stock
    )
    df = db.get_magazzino()
    row = df.iloc[-1].to_dict()
    if row.get("codice_univoco") != row.get("codice_univoco"):
        row["codice_univoco"] = None
    return row


@router.delete("/{magazzino_id}", status_code=204)
def delete_magazzino(magazzino_id: int):
    db.delete_magazzino(magazzino_id)


@router.post("/{magazzino_id}/attiva")
def attiva_bobina(magazzino_id: int):
    codice = db.attiva_bobina_nuova(magazzino_id)
    if not codice:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    return {"codice": codice}


@router.get("/by-codice/{codice}", response_model=MagazzinoOut)
def get_by_codice(codice: str):
    row = db.get_bobina_by_codice(codice)
    if not row:
        raise HTTPException(status_code=404, detail="Bobina non trovata")
    if row.get("codice_univoco") != row.get("codice_univoco"):
        row["codice_univoco"] = None
    return row
