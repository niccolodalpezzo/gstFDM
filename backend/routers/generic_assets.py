from typing import List

from fastapi import APIRouter, HTTPException

from backend.repositories import inventory
from backend.schemas import GenericAssetCreate, GenericAssetOut

router = APIRouter()


@router.get("", response_model=List[GenericAssetOut])
def list_assets():
    return inventory.list_generic_assets()


@router.post("", response_model=GenericAssetOut, status_code=201)
def create_asset(body: GenericAssetCreate):
    asset = inventory.create_generic_asset(body)
    if asset is None:
        raise HTTPException(status_code=500, detail="Creazione asset fallita")
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int):
    inventory.delete_generic_asset(asset_id)
