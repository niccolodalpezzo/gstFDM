from fastapi import APIRouter, HTTPException
from typing import List
import database
from schemas import ClienteCreate, ClienteOut

router = APIRouter()

@router.get("/", response_model=List[ClienteOut])
def get_clienti():
    df = database.get_clienti()
    return df.to_dict(orient="records")

@router.post("/", response_model=ClienteOut)
def create_cliente(cliente: ClienteCreate):
    new_id = database.add_cliente(
        nome=cliente.nome,
        cognome=cliente.cognome,
        azienda=cliente.azienda,
        email=cliente.email,
        p_iva=cliente.p_iva,
        sdi=cliente.sdi,
        cf=cliente.cf,
        indirizzo=cliente.indirizzo,
        note=cliente.note
    )
    return {**cliente.dict(), "id": new_id, "data_aggiunta": None}

@router.put("/{cliente_id}", response_model=ClienteOut)
def update_cliente(cliente_id: int, cliente: ClienteCreate):
    database.update_cliente(
        cliente_id,
        nome=cliente.nome,
        cognome=cliente.cognome,
        azienda=cliente.azienda,
        email=cliente.email,
        p_iva=cliente.p_iva,
        sdi=cliente.sdi,
        cf=cliente.cf,
        indirizzo=cliente.indirizzo,
        note=cliente.note
    )
    return {**cliente.dict(), "id": cliente_id, "data_aggiunta": None}

@router.delete("/{cliente_id}")
def delete_cliente(cliente_id: int):
    database.delete_cliente(cliente_id)
    return {"status": "ok"}
