from typing import List

from fastapi import APIRouter, HTTPException

from backend.repositories import inventory
from backend.schemas import ComponentReplacementCreate, ComponentReplacementOut
from backend.services import component_catalog_service, allocation_service, settings_service

router = APIRouter()


@router.get("/metadata")
def get_component_metadata():
    return component_catalog_service.get_component_catalog_metadata()


@router.get("", response_model=List[ComponentReplacementOut])
def list_components():
    return inventory.list_component_replacements()


@router.post("", response_model=ComponentReplacementOut, status_code=201)
def create_component(body: ComponentReplacementCreate):
    item = inventory.create_component_replacement(body)
    if not item:
        raise HTTPException(status_code=500, detail="Insert failed")

    # Se spalma_costo_farm è attivo, crea una allocation
    if body.spalma_costo_farm:
        costo_totale = float(body.unit_cost or 0) * float(body.stock_quantity or 0)
        if costo_totale > 0:
            settings = settings_service.get_settings()
            ore_mensili = float(settings.get("ore_lavorative_mensili_farm", 160))
            if ore_mensili > 0:
                allocation_service.create_allocation(
                    source_type="generic_component",
                    source_id=item["id"],
                    descrizione=f"Componente: {body.name}",
                    costo_totale=costo_totale,
                    ore_da_spalmare=ore_mensili,
                )

    return item


@router.delete("/{component_id}", status_code=204)
def delete_component(component_id: int):
    # Disattiva l'eventuale allocation collegata prima di eliminare
    allocation_service.deactivate_component_allocation(component_id)
    inventory.delete_component_replacement(component_id)
