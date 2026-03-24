from typing import List

from fastapi import APIRouter

from backend.repositories import inventory
from backend.schemas import MaterialDensityRatio

router = APIRouter()


@router.get("", response_model=List[MaterialDensityRatio])
def list_ratios():
    return inventory.list_material_density_ratios()


@router.put("", response_model=MaterialDensityRatio)
def upsert_ratio(body: MaterialDensityRatio):
    inventory.upsert_material_density_ratio(body.material, body.multiplier, body.notes)
    return body


@router.delete("/{material}", status_code=204)
def delete_ratio(material: str):
    inventory.delete_material_density_ratio(material)
