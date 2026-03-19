from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import SpesaUnaTantumCreate, SpesaUnaTantumOut
import database as db

router = APIRouter()


@router.get("", response_model=List[SpesaUnaTantumOut])
def list_spese():
    df = db.get_spese_una_tantum()
    return df.to_dict("records")


@router.post("", response_model=SpesaUnaTantumOut, status_code=201)
def create_spesa(body: SpesaUnaTantumCreate):
    db.add_spesa_una_tantum(body.descrizione, body.importo, body.data, body.note, body.fornitore_id)
    df = db.get_spese_una_tantum()
    return df.iloc[0].to_dict()


@router.delete("/{spesa_id}", status_code=204)
def delete_spesa(spesa_id: int):
    db.delete_spesa_una_tantum(spesa_id)
