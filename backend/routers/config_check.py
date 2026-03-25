from fastapi import APIRouter

from backend.services import config_check_service

router = APIRouter()


@router.get("")
def check_config():
    return config_check_service.check_configuration()
