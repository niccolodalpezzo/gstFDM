"""Provider Klipper/Moonraker — probe via HTTP REST."""
from __future__ import annotations

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any

_DEFAULT_PORT = 7125
_TIMEOUT = 3  # secondi


def _get(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        return json.loads(resp.read().decode())


def probe(host: str, port: int | None = None) -> dict:
    """
    Esegue il probe su Moonraker e restituisce uno stato normalizzato.

    Ritorna un dict con le chiavi del modello PrinterLiveStatus.
    Lancia ConnectionError se l'host non risponde o non è Moonraker.
    """
    port = port or _DEFAULT_PORT
    base = f"http://{host}:{port}"

    # 1. Verifica che sia Moonraker
    info = _get(f"{base}/printer/info")
    if "result" not in info:
        raise ConnectionError("Non è un server Moonraker valido")

    # 2. Fetch stato stampa
    stats_url = f"{base}/printer/objects/query?print_stats&virtual_sdcard&display_status"
    stats = _get(stats_url)
    objects = stats.get("result", {}).get("status", {})

    print_stats = objects.get("print_stats", {})
    virtual_sdcard = objects.get("virtual_sdcard", {})
    display_status = objects.get("display_status", {})

    state_raw = print_stats.get("state", "standby")
    STATE_MAP = {
        "standby": "idle",
        "printing": "printing",
        "paused": "paused",
        "complete": "completed",
        "error": "error",
        "cancelled": "idle",
    }
    live_print_state = STATE_MAP.get(state_raw, "unknown")
    live_busy = live_print_state == "printing"

    progress_raw = virtual_sdcard.get("progress") or display_status.get("progress")
    live_progress = round(float(progress_raw) * 100, 1) if progress_raw is not None else None

    filename = print_stats.get("filename") or None
    total_duration = print_stats.get("total_duration") or 0
    print_duration = print_stats.get("print_duration") or 0

    remaining: int | None = None
    if live_busy and print_duration > 0 and live_progress and live_progress > 0:
        elapsed_ratio = live_progress / 100.0
        estimated_total = print_duration / elapsed_ratio
        remaining = int(estimated_total - print_duration)

    message = print_stats.get("message") or None

    return {
        "detected_connection_type": "klipper",
        "live_connection_state": "online",
        "live_print_state": live_print_state,
        "live_busy": live_busy,
        "live_progress_percent": live_progress,
        "live_job_name": filename,
        "live_remaining_time_sec": remaining,
        "live_status_message": message,
        "live_last_seen_at": datetime.now(timezone.utc).isoformat(),
    }
