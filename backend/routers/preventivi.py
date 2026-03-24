from typing import List

from fastapi import APIRouter, HTTPException

from backend.schemas import (
    ClienteOut,
    CostoStraordinarioStrutturaCreate,
    CostoStraordinarioStrutturaOut,
    MaterialConfig,
    MaterialConfigOut,
    PreventivoCreate,
    PreventivoListItem,
    PreventivoOut,
    PreventivoPreviewResponse,
    MagazzinoOut,
    StampanteOut,
)
from backend.services import quote_service

router = APIRouter()


@router.get("", response_model=List[PreventivoListItem])
def list_preventivi():
    return quote_service.list_quotes()


@router.post("/preview", response_model=PreventivoPreviewResponse)
def preview_preventivo(body: PreventivoCreate):
    try:
        return quote_service.preview_quote(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/options/materials", response_model=List[MagazzinoOut])
def list_material_options():
    return quote_service.list_quote_options()["materials"]


@router.get("/options/printers", response_model=List[StampanteOut])
def list_printer_options():
    return quote_service.list_quote_options()["printers"]


@router.get("/options/clients", response_model=List[ClienteOut])
def list_client_options():
    return quote_service.list_quote_options()["clients"]


@router.get("/config/materiali", response_model=List[MaterialConfigOut])
def list_material_configs():
    return quote_service.list_material_configs()


@router.put("/config/materiali", response_model=MaterialConfigOut)
def upsert_material_config(body: MaterialConfig):
    return quote_service.upsert_material_config(body.model_dump())


@router.delete("/config/materiali/{config_id}", status_code=204)
def delete_material_config(config_id: int):
    quote_service.delete_material_config(config_id)


@router.get("/costi-struttura", response_model=List[CostoStraordinarioStrutturaOut])
def list_structure_costs():
    return quote_service.list_structure_costs()


@router.post("/costi-struttura", response_model=CostoStraordinarioStrutturaOut, status_code=201)
def create_structure_cost(body: CostoStraordinarioStrutturaCreate):
    return quote_service.create_structure_cost(body.model_dump())


@router.put("/costi-struttura/{structure_id}", response_model=CostoStraordinarioStrutturaOut)
def update_structure_cost(structure_id: int, body: CostoStraordinarioStrutturaCreate):
    try:
        return quote_service.update_structure_cost(structure_id, body.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/costi-struttura/{structure_id}", status_code=204)
def delete_structure_cost(structure_id: int):
    quote_service.delete_structure_cost(structure_id)


@router.get("/{preventivo_id}", response_model=PreventivoOut)
def get_preventivo(preventivo_id: int):
    try:
        return quote_service.get_quote(preventivo_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=PreventivoOut, status_code=201)
def create_preventivo(body: PreventivoCreate):
    try:
        return quote_service.create_quote(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.put("/{preventivo_id}", response_model=PreventivoOut)
def update_preventivo(preventivo_id: int, body: PreventivoCreate):
    try:
        return quote_service.update_quote(preventivo_id, body.model_dump())
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{preventivo_id}/recalculate", response_model=PreventivoOut)
def recalculate_preventivo(preventivo_id: int):
    try:
        return quote_service.recalculate_quote(preventivo_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{preventivo_id}/confirm", response_model=PreventivoOut)
def confirm_preventivo(preventivo_id: int):
    try:
        return quote_service.confirm_quote(preventivo_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{preventivo_id}/convert", response_model=PreventivoOut)
def convert_preventivo(preventivo_id: int):
    try:
        return quote_service.convert_quote(preventivo_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/{preventivo_id}", status_code=204)
def delete_preventivo(preventivo_id: int):
    quote_service.delete_quote(preventivo_id)
