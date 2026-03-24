from typing import List

from fastapi import APIRouter

from backend.repositories import inventory
from backend.schemas import TareOverride

router = APIRouter()


@router.get("", response_model=List[TareOverride])
def list_tare_overrides():
    return inventory.list_tare_overrides()


@router.put("", status_code=200)
def upsert_tare_override(body: TareOverride):
    inventory.upsert_tare_override(body.marca, body.materiale, body.tare_g)
    return {"ok": True}


@router.delete("/{marca}/{materiale}", status_code=204)
def delete_tare_override(marca: str, materiale: str):
    inventory.delete_tare_override(marca, materiale)
