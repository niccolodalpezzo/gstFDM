"""Detector unificato per il live status delle stampanti.

Logica di detection:
1. Se network_host non configurato → not_configured
2. Se marca è "Bambu Lab" → prova prima Bambu (hint di priorità)
3. Altrimenti prova prima Klipper/Moonraker
4. Se il primo tentativo fallisce, prova l'altro provider
5. Se entrambi falliscono → offline

La detection si basa su probe reali, non solo sulla marca.
"""
from __future__ import annotations

from backend.services.printer_live_status import klipper, bambu

_NOT_CONFIGURED: dict = {
    "detected_connection_type": "unknown",
    "live_connection_state": "not_configured",
    "live_print_state": "unknown",
    "live_busy": False,
    "live_progress_percent": None,
    "live_job_name": None,
    "live_remaining_time_sec": None,
    "live_status_message": "Nessun indirizzo di rete configurato",
    "live_last_seen_at": None,
}

_OFFLINE: dict = {
    "detected_connection_type": "unknown",
    "live_connection_state": "offline",
    "live_print_state": "unknown",
    "live_busy": False,
    "live_progress_percent": None,
    "live_job_name": None,
    "live_remaining_time_sec": None,
    "live_status_message": "Host non raggiungibile e provider non rilevato",
    "live_last_seen_at": None,
}


def _is_bambu_brand(marca: str | None) -> bool:
    return (marca or "").strip().lower() == "bambu lab"


def _try_klipper(host: str, port: int | None) -> dict | None:
    try:
        return klipper.probe(host, port)
    except Exception:
        return None


def _try_bambu(host: str, port: int | None, serial: str | None, access_code: str | None) -> dict | None:
    try:
        result = bambu.probe(host, port, serial, access_code)
        # Se offline (TCP fallito), non possiamo confermare che sia Bambu → torna None
        # così il detector può restituire _OFFLINE generico.
        # auth_required e online sono provider confermati perché la porta 8883 risponde.
        if result.get("live_connection_state") == "offline":
            return None
        return result
    except Exception:
        return None


def detect_live_status(printer: dict) -> dict:
    """
    Dato un dict stampante (con i campi network_*), restituisce lo stato live normalizzato.
    """
    host = (printer.get("network_host") or "").strip()
    if not host:
        return dict(_NOT_CONFIGURED)

    port = printer.get("network_port")
    serial = (printer.get("network_serial") or "").strip() or None
    access_code = (printer.get("lan_access_code") or "").strip() or None
    marca = printer.get("marca")

    if _is_bambu_brand(marca):
        # Per Bambu, proviamo direttamente il probe Bambu
        result = _try_bambu(host, port, serial, access_code)
        if result is not None:
            return result
        # Fallback: prova Klipper (caso edge: stampante con firmware custom)
        klipper_result = _try_klipper(host, port)
        if klipper_result is not None:
            return klipper_result
        return dict(_OFFLINE)

    # Brand non-Bambu: prova prima Klipper/Moonraker
    klipper_result = _try_klipper(host, port)
    if klipper_result is not None:
        return klipper_result

    # Fallback: potrebbe essere una Bambu con marca non impostata correttamente
    bambu_result = _try_bambu(host, port, serial, access_code)
    if bambu_result is not None:
        return bambu_result

    return dict(_OFFLINE)
