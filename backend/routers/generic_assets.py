from fastapi import APIRouter
from typing import List
from backend.schemas import GenericAssetCreate, GenericAssetOut
import database as db

router = APIRouter()


@router.get("", response_model=List[GenericAssetOut])
def list_assets():
    return db.get_generic_assets()


@router.post("", response_model=GenericAssetOut, status_code=201)
def create_asset(body: GenericAssetCreate):
    db.add_generic_asset(
        body.name, body.category, body.quantity,
        body.unit, body.unit_cost, body.notes,
    )
    items = db.get_generic_assets()
    return items[-1]


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int):
    db.delete_generic_asset(asset_id)
