from typing import List, Optional

from fastapi import APIRouter, HTTPException

from backend.schemas import (
    MaintenanceTemplateCreate, MaintenanceTemplateOut,
    PrinterMaintenanceStatusOut, MarkDoneRequest,
    ExtraordinaryMaintenanceCreate, ExtraordinaryMaintenanceOut,
)
from backend.services import maintenance_service

router = APIRouter()


# ─── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[MaintenanceTemplateOut])
def list_templates():
    return maintenance_service.list_templates()


@router.post("/templates", response_model=MaintenanceTemplateOut, status_code=201)
def create_template(body: MaintenanceTemplateCreate):
    result = maintenance_service.create_template(body)
    if result is None:
        raise HTTPException(status_code=500, detail="Creazione template fallita")
    return result


@router.put("/templates/{template_id}", response_model=MaintenanceTemplateOut)
def update_template(template_id: int, body: MaintenanceTemplateCreate):
    result = maintenance_service.update_template(template_id, body)
    if result is None:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return result


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int):
    maintenance_service.delete_template(template_id)


# ─── Printer maintenance status ───────────────────────────────────────────────

@router.get("/stampanti", response_model=List[PrinterMaintenanceStatusOut])
def list_printers_status():
    return maintenance_service.get_all_printers_maintenance()


@router.get("/stampanti/{printer_id}", response_model=PrinterMaintenanceStatusOut)
def get_printer_status(printer_id: int):
    result = maintenance_service.get_printer_maintenance_status(printer_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Stampante non trovata")
    return result


@router.post("/stampanti/{printer_id}/templates/{template_id}/done",
             response_model=PrinterMaintenanceStatusOut)
def mark_done(printer_id: int, template_id: int, body: MarkDoneRequest):
    result = maintenance_service.mark_done(
        printer_id=printer_id,
        template_id=template_id,
        accumulated_hours=body.accumulated_hours,
        note=body.note,
        tempo_impiegato_minuti=body.tempo_impiegato_minuti,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Stampante non trovata")
    return result


# ─── Dashboard alerts ─────────────────────────────────────────────────────────

@router.get("/dashboard-alerts", response_model=List[PrinterMaintenanceStatusOut])
def dashboard_alerts():
    return maintenance_service.get_dashboard_alerts()


# ─── Extraordinary maintenance ────────────────────────────────────────────────

@router.get("/straordinaria", response_model=List[ExtraordinaryMaintenanceOut])
def list_extraordinary(printer_id: Optional[int] = None):
    return maintenance_service.list_extraordinary(printer_id=printer_id)


@router.post("/straordinaria", response_model=ExtraordinaryMaintenanceOut, status_code=201)
def create_extraordinary(body: ExtraordinaryMaintenanceCreate):
    result = maintenance_service.create_extraordinary(body)
    if result is None:
        raise HTTPException(status_code=500, detail="Creazione manutenzione straordinaria fallita")
    return result


@router.delete("/straordinaria/{maint_id}", status_code=204)
def delete_extraordinary(maint_id: int):
    maintenance_service.delete_extraordinary(maint_id)
