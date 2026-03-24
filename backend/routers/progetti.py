import os
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.schemas import ProgettoCreate, ProgettoOut
from backend.services import project_service

router = APIRouter()


@router.get("", response_model=List[ProgettoOut])
def list_progetti():
    return project_service.list_projects()


@router.post("", response_model=ProgettoOut, status_code=201)
def create_progetto(body: ProgettoCreate):
    project = project_service.create_project(body)
    if project is None:
        raise HTTPException(status_code=500, detail="Creazione progetto fallita")
    return project


@router.put("/{progetto_id}", response_model=ProgettoOut)
def update_progetto(progetto_id: int, body: ProgettoCreate):
    if project_service.get_project(progetto_id) is None:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    project = project_service.update_project(progetto_id, body)
    if project is None:
        raise HTTPException(status_code=500, detail="Aggiornamento progetto fallito")
    return project


@router.delete("/{progetto_id}", status_code=204)
def delete_progetto(progetto_id: int):
    project_service.delete_project(progetto_id)


@router.get("/{progetto_id}/report")
def get_report(progetto_id: int):
    report_data = project_service.generate_project_report(progetto_id)
    if report_data is None:
        raise HTTPException(status_code=404, detail="Progetto non trovato")

    filepath, project_name = report_data
    return FileResponse(
        path=filepath,
        media_type="text/plain",
        filename=os.path.basename(filepath) or f"{project_name}.txt",
    )
