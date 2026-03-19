from fastapi import APIRouter
from typing import List
from backend.schemas import TareOverride
import database as db

router = APIRouter()


@router.get("", response_model=List[TareOverride])
def list_tare_overrides():
    df = db.get_tare_overrides()
    return df.to_dict("records")


@router.put("", status_code=200)
def upsert_tare_override(body: TareOverride):
    db.set_tare_override(body.marca, body.materiale, body.tare_g)
    return {"ok": True}


@router.delete("/{marca}/{materiale}", status_code=204)
def delete_tare_override(marca: str, materiale: str):
    db.delete_tare_override(marca, materiale)
