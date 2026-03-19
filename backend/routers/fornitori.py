from fastapi import APIRouter, HTTPException
from typing import List
import database
from schemas import FornitoreCreate, FornitoreOut

router = APIRouter()

@router.get("/", response_model=List[FornitoreOut])
def get_fornitori():
    df = database.get_fornitori()
    return df.to_dict(orient="records")

@router.post("/", response_model=FornitoreOut)
def create_fornitore(fornitore: FornitoreCreate):
    new_id = database.add_fornitore(
        ragione_sociale=fornitore.ragione_sociale,
        p_iva=fornitore.p_iva,
        sdi=fornitore.sdi,
        referente=fornitore.referente,
        email=fornitore.email,
        telefono=fornitore.telefono,
        indirizzo=fornitore.indirizzo,
        citta=fornitore.citta,
        cap=fornitore.cap,
        provincia=fornitore.provincia,
        categoria=fornitore.categoria,
        note=fornitore.note
    )
    return {**fornitore.dict(), "id": new_id, "data_aggiunta": None}

@router.put("/{fornitore_id}", response_model=FornitoreOut)
def update_fornitore(fornitore_id: int, fornitore: FornitoreCreate):
    database.update_fornitore(
        fornitore_id,
        ragione_sociale=fornitore.ragione_sociale,
        p_iva=fornitore.p_iva,
        sdi=fornitore.sdi,
        referente=fornitore.referente,
        email=fornitore.email,
        telefono=fornitore.telefono,
        indirizzo=fornitore.indirizzo,
        citta=fornitore.citta,
        cap=fornitore.cap,
        provincia=fornitore.provincia,
        categoria=fornitore.categoria,
        note=fornitore.note
    )
    return {**fornitore.dict(), "id": fornitore_id, "data_aggiunta": None}

@router.delete("/{fornitore_id}")
def delete_fornitore(fornitore_id: int):
    database.delete_fornitore(fornitore_id)
    return {"status": "ok"}
