from __future__ import annotations

from backend.repositories import settings_repository


def get_settings() -> dict:
    settings = settings_repository.get_settings()
    settings.setdefault("maintenance_interval_hours", 250.0)
    settings.setdefault("costo_orario_manodopera", settings.get("costo_orario_post_prod", 15.0))
    settings.setdefault("margine_lordo_default_perc", 35.0)
    settings.setdefault("costo_orario_progettazione_default", 25.0)
    settings.setdefault("criterio_rischio_default", "standard")
    settings.setdefault("theme_mode", "Scuro")
    settings.setdefault("theme_accent", "#6C63FF")
    settings.setdefault("theme_font", "Inter")
    settings.setdefault("company_name", "")
    settings.setdefault("company_piva", "")
    settings.setdefault("company_cf", "")
    settings.setdefault("company_indirizzo", "")
    settings.setdefault("company_cap", "")
    settings.setdefault("company_citta", "")
    settings.setdefault("company_provincia", "")
    settings.setdefault("company_telefono", "")
    settings.setdefault("company_email", "")
    settings.setdefault("company_sito", "")
    return settings


def update_settings(data: dict) -> dict:
    return settings_repository.save_settings(data)
