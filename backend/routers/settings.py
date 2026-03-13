from fastapi import APIRouter, HTTPException
from backend.schemas import Settings
import utils

router = APIRouter()


@router.get("", response_model=Settings)
def get_settings():
    s = utils.load_settings()
    # Assicura che i campi tema esistano (retrocompatibilità)
    s.setdefault("theme_mode", "Scuro")
    s.setdefault("theme_accent", "#6C63FF")
    s.setdefault("theme_font", "Inter")
    return s


@router.put("", response_model=Settings)
def update_settings(body: Settings):
    utils.save_settings(body.model_dump())
    return body
