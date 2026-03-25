from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.services import order_service

router = APIRouter()


@router.get("")
def list_ordini(stato: Optional[str] = None, cliente_id: Optional[int] = None):
    return order_service.list_orders(stato=stato, cliente_id=cliente_id)


@router.get("/{ordine_id}")
def get_ordine(ordine_id: int):
    try:
        return order_service.get_order(ordine_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{ordine_id}")
def update_ordine(ordine_id: int, body: dict):
    try:
        return order_service.update_order(ordine_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{ordine_id}", status_code=204)
def delete_ordine(ordine_id: int):
    order_service.delete_order(ordine_id)


@router.post("/{ordine_id}/transition")
def transition_ordine(ordine_id: int, body: dict):
    try:
        return order_service.transition_order(ordine_id, body.get("stato", ""))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


# ─── FILE ENDPOINTS ──────────────────────────────────────────────────────────

@router.post("/{ordine_id}/files")
async def upload_file(
    ordine_id: int,
    file: UploadFile = File(...),
    stampante_id: Optional[int] = Form(None),
    materiale_magazzino_id: Optional[int] = Form(None),
    tempo_stimato_minuti: float = Form(0.0),
    quantita: int = Form(1),
    note: str = Form(""),
):
    try:
        metadata = {
            "stampante_id": stampante_id,
            "materiale_magazzino_id": materiale_magazzino_id,
            "tempo_stimato_minuti": tempo_stimato_minuti,
            "quantita": quantita,
            "note": note,
        }
        return await order_service.add_file_to_order(ordine_id, file, metadata)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{ordine_id}/files/{file_id}")
def update_file(ordine_id: int, file_id: int, body: dict):
    try:
        return order_service.update_order_file(ordine_id, file_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{ordine_id}/files/{file_id}", status_code=204)
def delete_file(ordine_id: int, file_id: int):
    try:
        order_service.delete_order_file(ordine_id, file_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{ordine_id}/files/{file_id}/download")
def download_file(ordine_id: int, file_id: int):
    try:
        path = order_service.get_file_path(ordine_id, file_id)
        return FileResponse(path)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ─── JOB GENERATION ──────────────────────────────────────────────────────────

@router.post("/{ordine_id}/files/{file_id}/generate-jobs")
def generate_jobs(ordine_id: int, file_id: int):
    from backend.services import job_service
    try:
        return job_service.generate_jobs_from_file(ordine_id, file_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
