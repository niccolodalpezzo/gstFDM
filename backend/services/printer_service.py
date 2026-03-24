from __future__ import annotations

import json

from backend.repositories import inventory, printers
from backend.services import settings_service
from backend.services.printer_live_status.detector import detect_live_status

CLOSED_ECOSYSTEM_BRANDS = {"bambu lab", "anycubic", "prusa research"}


def _normalize_kind(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized.startswith("piatto"):
        return "piatto"
    if normalized == "modulo multicolore":
        return "multicolor"
    if normalized == "nozzle":
        return "nozzle"
    return normalized


def _same_text(left: str | None, right: str | None) -> bool:
    return (left or "").strip().lower() == (right or "").strip().lower()


def _parse_multicolor_ids(raw_value) -> list[int]:
    if raw_value in (None, "", []):
        return []
    if isinstance(raw_value, list):
        return [int(item) for item in raw_value]
    try:
        return [int(item) for item in json.loads(raw_value)]
    except (TypeError, ValueError, json.JSONDecodeError):
        return []


def _component_ref(component: dict) -> dict:
    return {
        "id": component["id"],
        "asset_uid": component["asset_uid"],
        "name": component["name"],
        "tipo_pezzo": component.get("tipo_pezzo", "Altro"),
    }


def _printer_matches_component(component: dict, printer: dict) -> bool:
    if printer["id"] in component.get("stampante_ids", []):
        return True

    for rule in component.get("compatibility_printers", []):
        if _same_text(rule.get("brand"), printer.get("marca")) and _same_text(rule.get("model"), printer.get("modello")):
            return True

    return False


def _plate_matches(component: dict, printer: dict) -> bool:
    if _printer_matches_component(component, printer):
        return True

    bed_x = float(printer.get("build_volume_x") or 0)
    bed_y = float(printer.get("build_volume_y") or 0)
    if bed_x <= 0 or bed_y <= 0:
        return False

    compatibility_beds = component.get("compatibility_beds", [])
    if not compatibility_beds and component.get("bed_size_x") and component.get("bed_size_y"):
        compatibility_beds = [{
            "size_x": component["bed_size_x"],
            "size_y": component["bed_size_y"],
            "tolerance_pct": 5.0,
        }]

    for rule in compatibility_beds:
        plate_x = float(rule.get("size_x") or 0)
        plate_y = float(rule.get("size_y") or 0)
        tolerance_pct = float(rule.get("tolerance_pct") or 5.0) / 100.0
        if plate_x >= bed_x and plate_x <= bed_x * (1 + tolerance_pct) and plate_y >= bed_y and plate_y <= bed_y * (1 + tolerance_pct):
            return True
    return False


def _multicolor_matches(component: dict, printer: dict) -> bool:
    for profile in component.get("compatibility_multicolor", []):
        profile_brand = (profile.get("brand") or "").strip().lower()
        compatible_models = [str(model).strip().lower() for model in profile.get("compatible_models", [])]
        printer_brand = (printer.get("marca") or "").strip().lower()
        printer_model = (printer.get("modello") or "").strip().lower()

        if profile_brand == printer_brand and printer_model in compatible_models:
            return True

        if profile_brand == "klipper / open":
            if printer_brand not in CLOSED_ECOSYSTEM_BRANDS:
                return True

    return _printer_matches_component(component, printer)


def _component_is_compatible(component: dict, printer: dict, slot: str) -> bool:
    kind = _normalize_kind(component.get("tipo_pezzo"))
    if slot == "nozzle":
        return kind == "nozzle" and _printer_matches_component(component, printer)
    if slot == "plate":
        return kind == "piatto" and _plate_matches(component, printer)
    if slot == "multicolor":
        return kind == "multicolor" and _multicolor_matches(component, printer)
    return False


def _maintenance_snapshot(printer: dict, settings: dict) -> dict:
    effective_interval = printer.get("maintenance_interval_hours")
    if effective_interval is None:
        effective_interval = settings.get("maintenance_interval_hours")

    if effective_interval is None or float(effective_interval) <= 0:
        return {
            **printer,
            "effective_maintenance_interval_hours": None,
            "next_maintenance_hours": None,
            "maintenance_remaining_hours": None,
            "maintenance_status": "ok",
        }

    effective_interval = float(effective_interval)
    accumulated = float(printer.get("accumulated_runtime_hours") or 0)
    last_maintenance = float(printer.get("last_maintenance_hours") or 0)
    next_maintenance = last_maintenance + effective_interval
    remaining = next_maintenance - accumulated
    warning_threshold = max(1.0, effective_interval * 0.1)
    status = "due" if remaining <= 0 else "warning" if remaining <= warning_threshold else "ok"

    return {
        **printer,
        "effective_maintenance_interval_hours": round(effective_interval, 2),
        "next_maintenance_hours": round(next_maintenance, 2),
        "maintenance_remaining_hours": round(remaining, 2),
        "maintenance_status": status,
    }


def _enrich_printer(printer: dict, components: list[dict], settings: dict) -> dict:
    multicolor_ids = _parse_multicolor_ids(printer.get("active_multicolor_ids_json"))
    component_map = {component["id"]: component for component in components}
    active_multicolor_modules = [
        _component_ref(component_map[component_id])
        for component_id in multicolor_ids
        if component_id in component_map
    ]

    enriched = {
        **printer,
        "active_multicolor_ids": multicolor_ids,
        "active_multicolor_modules": active_multicolor_modules,
        "live_status": None,
    }
    return _maintenance_snapshot(enriched, settings)


def _validate_component_selection(data, printer: dict, components: list[dict]) -> tuple[int | None, int | None, list[int]]:
    nozzle_id = data.active_nozzle_id
    plate_id = data.active_plate_id
    multicolor_ids = list(data.active_multicolor_ids)

    if nozzle_id is not None:
        nozzle = inventory.get_component_replacement(nozzle_id)
        if not nozzle or not _component_is_compatible(nozzle, printer, "nozzle"):
            raise ValueError("Il nozzle selezionato non e compatibile con questa stampante")

    if plate_id is not None:
        plate = inventory.get_component_replacement(plate_id)
        if not plate or not _component_is_compatible(plate, printer, "plate"):
            raise ValueError("Il piatto selezionato non e compatibile con questa stampante")

    valid_multicolor_ids = []
    for component_id in multicolor_ids:
        module = inventory.get_component_replacement(component_id)
        if not module or not _component_is_compatible(module, printer, "multicolor"):
            raise ValueError("Uno dei moduli multicolore selezionati non e compatibile con questa stampante")
        valid_multicolor_ids.append(component_id)

    return nozzle_id, plate_id, valid_multicolor_ids


def list_printers() -> list[dict]:
    printer_items = printers.list_printers()
    component_items = inventory.list_component_replacements()
    settings = settings_service.get_settings()
    return [_enrich_printer(printer, component_items, settings) for printer in printer_items]


def create_printer(data) -> dict | None:
    component_items = inventory.list_component_replacements()
    validation_printer = {
        "id": -1,
        "marca": data.marca,
        "modello": data.modello,
        "build_volume_x": data.build_volume_x,
        "build_volume_y": data.build_volume_y,
    }
    active_nozzle_id, active_plate_id, active_multicolor_ids = _validate_component_selection(data, validation_printer, component_items)

    new_id = printers.create_printer(data)

    if active_nozzle_id is None and (data.diametro_ugello or 0) > 0:
        diameter = data.diametro_ugello
        printer_label = f"{data.marca} {data.modello}".strip()
        nozzle_name = f"Nozzle {diameter}mm - {printer_label}".strip(" -")
        component = inventory.create_component_replacement(
            name=nozzle_name,
            manufacturer=data.marca,
            part_number="",
            material="",
            stampante_ids=[new_id],
            compatibility_label=printer_label,
            dimensions=f"D{diameter}mm",
            installed_date=None,
            stock_quantity=1,
            minimum_stock=0,
            unit_cost=0.0,
            official=True,
            nozzle_diameter=diameter,
            compatibility_printers=[{"brand": data.marca, "model": data.modello}],
            notes="Creato automaticamente dalla registrazione stampante",
            tipo_pezzo="Nozzle",
        )
        if component:
            active_nozzle_id = component["id"]
            printers.update_printer(
                new_id,
                data,
                active_nozzle_id=active_nozzle_id,
                active_plate_id=active_plate_id,
                active_multicolor_ids=active_multicolor_ids,
            )
    else:
        printers.update_printer(
            new_id,
            data,
            active_nozzle_id=active_nozzle_id,
            active_plate_id=active_plate_id,
            active_multicolor_ids=active_multicolor_ids,
        )

    return get_printer(new_id)


def update_printer(printer_id: int, data) -> dict | None:
    existing = printers.get_printer(printer_id)
    if existing is None:
        return None

    validation_printer = {
        **existing,
        "id": printer_id,
        "marca": data.marca,
        "modello": data.modello,
        "build_volume_x": data.build_volume_x,
        "build_volume_y": data.build_volume_y,
    }
    component_items = inventory.list_component_replacements()
    nozzle_id, plate_id, multicolor_ids = _validate_component_selection(data, validation_printer, component_items)
    printers.update_printer(
        printer_id,
        data,
        active_nozzle_id=nozzle_id,
        active_plate_id=plate_id,
        active_multicolor_ids=multicolor_ids,
    )
    return get_printer(printer_id)


def delete_printer(printer_id: int) -> None:
    printers.delete_printer(printer_id)


def get_printer(printer_id: int) -> dict | None:
    printer = printers.get_printer(printer_id)
    if printer is None:
        return None
    return _enrich_printer(printer, inventory.list_component_replacements(), settings_service.get_settings())


def get_live_status(printer_id: int) -> dict | None:
    """Restituisce solo il live status normalizzato per una stampante."""
    printer = printers.get_printer(printer_id)
    if printer is None:
        return None
    return detect_live_status(printer)
