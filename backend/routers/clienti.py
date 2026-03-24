from typing import List

from fastapi import APIRouter

from backend.repositories import partners
from backend.schemas import ClienteCreate, ClienteOut

router = APIRouter()


@router.get("/", response_model=List[ClienteOut])
def get_clienti():
    return partners.list_clients()


@router.post("/", response_model=ClienteOut)
def create_cliente(cliente: ClienteCreate):
    return partners.create_client(cliente)


@router.put("/{cliente_id}", response_model=ClienteOut)
def update_cliente(cliente_id: int, cliente: ClienteCreate):
    return partners.update_client(cliente_id, cliente)


@router.delete("/{cliente_id}")
def delete_cliente(cliente_id: int):
    partners.delete_client(cliente_id)
    return {"status": "ok"}
