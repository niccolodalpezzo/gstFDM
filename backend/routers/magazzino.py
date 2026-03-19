from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import MagazzinoCreate, MagazzinoOut, MagazzinoUpdate, GrossWeightUpdate
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
    new_id = db.add_magazzino(
        body.marca, body.materiale, body.colore,
        body.costo_kg, body.grammi_residui, body.stato, body.quantita_stock, body.fornitore_id
    )
    df = db.get_magazzino()
    row = df[df["id"] == new_id].iloc[0].to_dict()
    if row.get("codice_univoco") != row.get("codice_univoco"):
        row["codice_univoco"] = None
    if row.get("gross_weight") != row.get("gross_weight"):
        row["gross_weight"] = None
    return row


@router.put("/{magazzino_id}", response_model=MagazzinoOut)
def update_magazzino(magazzino_id: int, body: MagazzinoUpdate):
    db.update_magazzino_details(
        magazzino_id, body.marca, body.materiale, body.colore,
        body.costo_kg, body.grammi_residui, body.quantita_stock, body.fornitore_id
    )
    df = db.get_magazzino()
    row = df[df["id"] == magazzino_id].iloc[0].to_dict()
    if row.get("codice_univoco") != row.get("codice_univoco"):
        row["codice_univoco"] = None
    return row


@router.patch("/{magazzino_id}/gross-weight", response_model=MagazzinoOut)
def update_gross_weight(magazzino_id: int, body: GrossWeightUpdate):
    db.update_gross_weight(magazzino_id, body.gross_weight, body.grammi_residui)
    df = db.get_magazzino()
    row = df[df["id"] == magazzino_id].iloc[0].to_dict()
    for k in ("codice_univoco", "gross_weight"):
        if row.get(k) != row.get(k):
            row[k] = None
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
