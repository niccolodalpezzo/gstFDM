from typing import List

from fastapi import APIRouter

from backend.repositories import partners
from backend.schemas import FornitoreCreate, FornitoreOut

router = APIRouter()


@router.get("/", response_model=List[FornitoreOut])
def get_fornitori():
    return partners.list_suppliers()


@router.post("/", response_model=FornitoreOut)
def create_fornitore(fornitore: FornitoreCreate):
    return partners.create_supplier(fornitore)


@router.put("/{fornitore_id}", response_model=FornitoreOut)
def update_fornitore(fornitore_id: int, fornitore: FornitoreCreate):
    return partners.update_supplier(fornitore_id, fornitore)


@router.delete("/{fornitore_id}")
def delete_fornitore(fornitore_id: int):
    partners.delete_supplier(fornitore_id)
    return {"status": "ok"}
