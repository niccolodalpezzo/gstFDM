from fastapi import APIRouter

from backend.schemas import Settings
from backend.services import settings_service

router = APIRouter()


@router.get("", response_model=Settings)
def get_settings():
    return settings_service.get_settings()


@router.put("", response_model=Settings)
def update_settings(body: Settings):
    return settings_service.update_settings(body.model_dump())
