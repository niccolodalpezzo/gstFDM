from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import ComponentReplacementCreate, ComponentReplacementOut
import database as db

router = APIRouter()


@router.get("", response_model=List[ComponentReplacementOut])
def list_components():
    return db.get_component_replacements()


@router.post("", response_model=ComponentReplacementOut, status_code=201)
def create_component(body: ComponentReplacementCreate):
    uid = db.add_component_replacement(
        body.name, body.material, body.stampante_ids,
        body.compatibility_label, body.dimensions,
        body.installed_date, body.notes, body.tipo_pezzo,
    )
    items = db.get_component_replacements()
    item = next((i for i in items if i["asset_uid"] == uid), None)
    if not item:
        raise HTTPException(status_code=500, detail="Insert failed")
    return item


@router.delete("/{component_id}", status_code=204)
def delete_component(component_id: int):
    db.delete_component_replacement(component_id)
