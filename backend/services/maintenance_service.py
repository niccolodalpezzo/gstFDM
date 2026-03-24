from __future__ import annotations

import json
from datetime import datetime, timezone

from backend.repositories import maintenance as repo
from backend.repositories import printers as printer_repo
from backend.services import settings_service

WARNING_THRESHOLD_PCT = 85.0  # sopra questa % si è in "warning"


def _compute_item(template: dict, state: dict | None, accumulated: float) -> dict:
    """Calcola lo stato di una singola voce manutenzione per una stampante."""
    soglia = float(template.get("soglia_ore_massima") or 200.0)
    last_done = float((state or {}).get("last_done_runtime_hours") or 0.0)
    elapsed = max(0.0, accumulated - last_done)
    progress_pct = min(100.0, (elapsed / soglia * 100) if soglia > 0 else 0.0)
    remaining = soglia - elapsed

    if elapsed >= soglia:
        stato = "due"
    elif progress_pct >= WARNING_THRESHOLD_PCT:
        stato = "warning"
    else:
        stato = "ok"

    return {
        "template_id": template["id"],
        "template_nome": template["nome"],
        "soglia_ore_massima": soglia,
        "last_done_runtime_hours": last_done,
        "last_done_at": (state or {}).get("last_done_at"),
        "note": (state or {}).get("note") or "",
        "elapsed_hours": round(elapsed, 2),
        "remaining_hours": round(remaining, 2),
        "progress_percent": round(progress_pct, 1),
        "stato": stato,
    }


def _worst(stati: list[str]) -> str:
    if "due" in stati:
        return "due"
    if "warning" in stati:
        return "warning"
    return "ok"


def _enrich_printer_maintenance(printer: dict, templates: list[dict], states: list[dict]) -> dict:
    """Restituisce il full maintenance status per una stampante."""
    accumulated = float(printer.get("accumulated_runtime_hours") or 0.0)
    state_map = {s["template_id"]: s for s in states}

    items = [_compute_item(t, state_map.get(t["id"]), accumulated) for t in templates if t.get("attiva")]
    worst = _worst([i["stato"] for i in items])

    display = (printer.get("asset_name") or "").strip()
    if not display:
        display = f"{printer.get('marca', '')} {printer.get('modello', '')}".strip()

    return {
        "printer_id": printer["id"],
        "printer_nome": display,
        "accumulated_runtime_hours": round(accumulated, 2),
        "items": items,
        "worst_stato": worst,
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def list_templates(only_active: bool = False) -> list[dict]:
    return repo.list_templates(only_active=only_active)


def create_template(data) -> dict | None:
    return repo.create_template(data)


def update_template(template_id: int, data) -> dict | None:
    return repo.update_template(template_id, data)


def delete_template(template_id: int) -> None:
    repo.delete_template(template_id)


def get_printer_maintenance_status(printer_id: int) -> dict | None:
    """Full maintenance status (items + computed) for a single printer."""
    printer = printer_repo.get_printer(printer_id)
    if printer is None:
        return None
    # Calcola accumulated_runtime_hours se mancante
    if "accumulated_runtime_hours" not in printer:
        printer["accumulated_runtime_hours"] = printer.get("initial_runtime_hours") or 0.0

    templates = repo.list_templates(only_active=True)
    states = repo.list_printer_states(printer_id)
    return _enrich_printer_maintenance(printer, templates, states)


def get_all_printers_maintenance() -> list[dict]:
    """Full maintenance status for all printers."""
    from backend.repositories.base import dataframe_to_records
    import database as db

    printers_raw = dataframe_to_records(db.get_stampanti())
    templates = repo.list_templates(only_active=True)
    all_states = {s["printer_id"]: [] for s in []}
    # Fetch all states in one shot
    from backend.repositories.base import dataframe_to_records as dtr
    states_all = dtr(db.get_printer_maintenance_states())
    for s in states_all:
        pid = s["printer_id"]
        if pid not in all_states:
            all_states[pid] = []
        all_states[pid].append(s)

    result = []
    for p in printers_raw:
        states = all_states.get(p["id"], [])
        result.append(_enrich_printer_maintenance(p, templates, states))
    return result


def get_dashboard_alerts() -> list[dict]:
    """Solo stampanti con almeno una voce warning o due."""
    all_status = get_all_printers_maintenance()
    alerts = []
    for ps in all_status:
        relevant = [i for i in ps["items"] if i["stato"] in ("warning", "due")]
        if relevant:
            alerts.append({
                "printer_id": ps["printer_id"],
                "printer_nome": ps["printer_nome"],
                "accumulated_runtime_hours": ps["accumulated_runtime_hours"],
                "items": relevant,
                "worst_stato": ps["worst_stato"],
            })
    return alerts


def mark_done(printer_id: int, template_id: int, accumulated_hours: float,
              note: str = "", tempo_impiegato_minuti: float = 0.0) -> dict | None:
    """Segna una voce di manutenzione come eseguita alla runtime corrente.
    Se tempo_impiegato_minuti > 0, crea una allocation di manodopera da spalmare sul costo orario farm.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    repo.upsert_state(
        printer_id=printer_id,
        template_id=template_id,
        last_done_runtime_hours=accumulated_hours,
        last_done_at=now_str,
        note=note,
    )

    if tempo_impiegato_minuti > 0:
        from backend.services import allocation_service
        settings = settings_service.get_settings()
        ore_mensili = float(settings.get("ore_lavorative_mensili_farm", 160))
        costo_orario = float(settings.get("costo_orario_post_prod", 15.0))

        if ore_mensili > 0:
            costo_manutenzione = (tempo_impiegato_minuti / 60.0) * costo_orario
            if costo_manutenzione > 0:
                template = repo.get_template(template_id)
                template_nome = template["nome"] if template else f"Template {template_id}"
                allocation_service.create_allocation(
                    source_type="ordinary_maintenance_labor",
                    source_id=None,
                    descrizione=f"Manodopera: {template_nome} — Stampante ID {printer_id}",
                    costo_totale=round(costo_manutenzione, 4),
                    ore_da_spalmare=ore_mensili,
                )

    return get_printer_maintenance_status(printer_id)


def create_extraordinary(data) -> dict:
    """Crea manutenzione straordinaria e auto-genera la spesa straordinaria."""
    import database as db
    from fastapi import HTTPException

    componenti = [c.dict() for c in data.componenti]
    costo_totale = sum(c.get("costo") or 0.0 for c in componenti)
    componenti_json = json.dumps(componenti)

    # Calcola spalmatura se il campo è fornito
    ore_spalmare = getattr(data, "ore_print_farm_da_spalmare", None)
    if ore_spalmare is not None:
        if ore_spalmare <= 0:
            raise HTTPException(
                status_code=422,
                detail="ore_print_farm_da_spalmare deve essere > 0"
            )
        if costo_totale <= 0:
            raise HTTPException(
                status_code=422,
                detail="Il costo totale ricambi deve essere > 0 per attivare la spalmatura"
            )
        quota_oraria_ricambi = round(costo_totale / ore_spalmare, 6)
        spalmatura_attiva = True
    else:
        quota_oraria_ricambi = 0.0
        spalmatura_attiva = False

    printer = printer_repo.get_printer(data.printer_id)
    printer_label = ""
    if printer:
        printer_label = (printer.get("asset_name") or "").strip()
        if not printer_label:
            printer_label = f"{printer.get('marca', '')} {printer.get('modello', '')}".strip()

    maint_id = repo.create_extraordinary(
        printer_id=data.printer_id,
        descrizione_problema=data.descrizione_problema,
        giorni_fermo=data.giorni_fermo,
        componenti_json=componenti_json,
        note=data.note,
        costo_totale=costo_totale,
        ore_print_farm_da_spalmare=ore_spalmare,
        quota_oraria_ricambi=quota_oraria_ricambi,
        ore_residue_da_spalmare=ore_spalmare,  # inizialmente coincide
        spalmatura_attiva=spalmatura_attiva,
    )

    # Auto-crea spesa straordinaria (comportamento invariato)
    if costo_totale > 0 or data.descrizione_problema:
        today = datetime.now().strftime("%Y-%m-%d")
        desc = f"Manutenzione straordinaria: {printer_label} — {data.descrizione_problema[:60]}"
        nota_spesa = f"Creata da manutenzione straordinaria ID {maint_id}.\n{data.note}".strip()
        if ore_spalmare:
            nota_spesa += f"\nSpalmatura attiva: {ore_spalmare}h — quota oraria ricambi: €{quota_oraria_ricambi:.4f}/h"
        spesa_id = db.add_spesa_una_tantum(
            descrizione=desc,
            importo=costo_totale,
            data=today,
            note=nota_spesa,
        )
        if spesa_id:
            repo.set_extraordinary_spesa(maint_id, spesa_id)

    records = repo.list_extraordinary()
    record = next((r for r in records if r["id"] == maint_id), None)
    if record:
        try:
            record["componenti"] = json.loads(record.get("componenti_json") or "[]")
        except Exception:
            record["componenti"] = []
    return record or {"id": maint_id, "printer_id": data.printer_id,
                      "descrizione_problema": data.descrizione_problema,
                      "costo_totale": costo_totale, "componenti": componenti}


def get_active_spalmatura(printer_id: int | None = None) -> list[dict]:
    """
    Restituisce le manutenzioni straordinarie con spalmatura attiva.
    Usato dai calcoli costi/pricing per leggere la quota_oraria_ricambi.
    Nota: ore_residue_da_spalmare non viene decrementato automaticamente;
    è un dato statico che richiede aggiornamento manuale futuro.
    """
    records = list_extraordinary(printer_id=printer_id)
    return [r for r in records if r.get("spalmatura_attiva")]


def list_extraordinary(printer_id: int | None = None) -> list[dict]:
    records = repo.list_extraordinary(printer_id=printer_id)
    for r in records:
        try:
            r["componenti"] = json.loads(r.get("componenti_json") or "[]")
        except Exception:
            r["componenti"] = []
    return records


def delete_extraordinary(maint_id: int) -> None:
    repo.delete_extraordinary(maint_id)
