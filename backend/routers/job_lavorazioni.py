from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.services import job_service

router = APIRouter()


@router.get("")
def list_jobs(
    ordine_id: Optional[int] = None,
    stampante_id: Optional[int] = None,
    stato: Optional[str] = None,
):
    return job_service.list_jobs(ordine_id=ordine_id, stampante_id=stampante_id, stato=stato)


@router.get("/{job_id}")
def get_job(job_id: int):
    try:
        return job_service.get_job(job_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{job_id}")
def update_job(job_id: int, body: dict):
    try:
        return job_service.update_job(job_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{job_id}/start")
def start_job(job_id: int):
    try:
        return job_service.start_job(job_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{job_id}/complete")
def complete_job(job_id: int, body: dict):
    try:
        return job_service.complete_job(job_id, body)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{job_id}/cancel")
def cancel_job(job_id: int):
    try:
        return job_service.cancel_job(job_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
