from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.services import shipping_service

router = APIRouter()


@router.get("")
def list_spedizioni(ordine_id: Optional[int] = None):
    return shipping_service.list_shipments(ordine_id=ordine_id)


@router.post("", status_code=201)
def create_spedizione(body: dict):
    try:
        return shipping_service.create_shipment(body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{spedizione_id}")
def get_spedizione(spedizione_id: int):
    try:
        return shipping_service.get_shipment(spedizione_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{spedizione_id}")
def update_spedizione(spedizione_id: int, body: dict):
    try:
        return shipping_service.update_shipment(spedizione_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{spedizione_id}/ship")
def ship_spedizione(spedizione_id: int, body: dict):
    try:
        return shipping_service.mark_shipped(spedizione_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{spedizione_id}/deliver")
def deliver_spedizione(spedizione_id: int):
    try:
        return shipping_service.mark_delivered(spedizione_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/{spedizione_id}", status_code=204)
def delete_spedizione(spedizione_id: int):
    shipping_service.delete_shipment(spedizione_id)
