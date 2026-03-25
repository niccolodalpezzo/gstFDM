from __future__ import annotations

import database as db
from backend.services import settings_service


def check_configuration() -> dict:
    """Verifica che la configurazione minima sia presente per operare."""
    settings = settings_service.get_settings()

    with db.get_db_connection() as conn:
        printer_count = conn.execute(
            "SELECT COUNT(*) AS cnt FROM stampanti"
        ).fetchone()["cnt"]

        material_count = conn.execute(
            "SELECT COUNT(*) AS cnt FROM magazzino WHERE costo_kg > 0"
        ).fetchone()["cnt"]

    checks = [
        {
            "key": "costo_kwh",
            "label": "Costo energia elettrica (€/kWh)",
            "ok": float(settings.get("costo_kwh", 0)) > 0,
            "value": str(settings.get("costo_kwh", 0)),
        },
        {
            "key": "costo_orario_manodopera",
            "label": "Costo orario manodopera (€/h)",
            "ok": float(settings.get("costo_orario_manodopera", 0)) > 0,
            "value": str(settings.get("costo_orario_manodopera", 0)),
        },
        {
            "key": "margine_lordo_default_perc",
            "label": "Margine lordo predefinito (%)",
            "ok": float(settings.get("margine_lordo_default_perc", 0)) > 0,
            "value": str(settings.get("margine_lordo_default_perc", 0)),
        },
        {
            "key": "ore_lavorative_mensili_farm",
            "label": "Ore lavorative mensili della farm",
            "ok": float(settings.get("ore_lavorative_mensili_farm", 0)) > 0,
            "value": str(settings.get("ore_lavorative_mensili_farm", 0)),
        },
        {
            "key": "stampanti",
            "label": "Almeno una stampante configurata",
            "ok": int(printer_count) > 0,
            "value": f"{printer_count} stampanti",
        },
        {
            "key": "materiali",
            "label": "Almeno un materiale con costo €/kg valido",
            "ok": int(material_count) > 0,
            "value": f"{material_count} materiali",
        },
    ]

    return {
        "ready": all(c["ok"] for c in checks),
        "checks": checks,
    }
