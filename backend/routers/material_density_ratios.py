from fastapi import APIRouter
from typing import List
from backend.schemas import MaterialDensityRatio
import database as db

router = APIRouter()


@router.get("", response_model=List[MaterialDensityRatio])
def list_ratios():
    return db.get_material_density_ratios()


@router.put("", response_model=MaterialDensityRatio)
def upsert_ratio(body: MaterialDensityRatio):
    db.upsert_material_density_ratio(body.material, body.multiplier, body.notes)
    return body


@router.delete("/{material}", status_code=204)
def delete_ratio(material: str):
    db.delete_material_density_ratio(material)
