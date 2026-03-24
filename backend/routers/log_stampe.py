from typing import List, Optional

from fastapi import APIRouter, HTTPException

from backend.schemas import LogStampaCreate, LogStampaOut
from backend.services import log_service

router = APIRouter()


@router.get("", response_model=List[LogStampaOut])
def list_log_stampe(progetto_id: Optional[int] = None):
    return log_service.list_print_logs(progetto_id)


@router.post("", response_model=LogStampaOut, status_code=201)
def create_log_stampa(body: LogStampaCreate):
    log_item = log_service.create_print_log(body)
    if log_item is None:
        raise HTTPException(
            status_code=404,
            detail=f"Bobina con codice '{body.codice_bobina}' non trovata o non attiva",
        )
    return log_item
