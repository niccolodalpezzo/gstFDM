from __future__ import annotations

from backend.repositories.base import dataframe_to_records
import database as db


def list_printers() -> list[dict]:
    return dataframe_to_records(db.get_stampanti())


def get_printer(printer_id: int) -> dict | None:
    return next((printer for printer in list_printers() if printer["id"] == printer_id), None)


def create_printer(data) -> int:
    return db.add_stampante(
        data.marca,
        data.modello,
        data.diametro_ugello,
        data.consumo_w,
        data.costo_acquisto,
        data.ammortamento_orario,
        data.asset_name,
        data.status,
        data.build_volume_x,
        data.build_volume_y,
        data.build_volume_z,
        data.initial_runtime_hours,
        data.active_nozzle_id,
        data.active_plate_id,
        data.active_multicolor_ids,
        data.maintenance_interval_hours,
        data.last_maintenance_hours,
        getattr(data, "network_host", None),
        getattr(data, "network_port", None),
        getattr(data, "network_serial", None),
        getattr(data, "lan_access_code", None),
    )


def update_printer(printer_id: int, data, active_nozzle_id=None, active_plate_id=None, active_multicolor_ids=None) -> None:
    db.update_stampante(
        printer_id,
        data.marca,
        data.modello,
        data.diametro_ugello,
        data.consumo_w,
        data.costo_acquisto,
        data.ammortamento_orario,
        data.asset_name,
        data.status,
        data.build_volume_x,
        data.build_volume_y,
        data.build_volume_z,
        data.initial_runtime_hours,
        data.active_nozzle_id if active_nozzle_id is None else active_nozzle_id,
        data.active_plate_id if active_plate_id is None else active_plate_id,
        data.active_multicolor_ids if active_multicolor_ids is None else active_multicolor_ids,
        data.maintenance_interval_hours,
        data.last_maintenance_hours,
        getattr(data, "network_host", None),
        getattr(data, "network_port", None),
        getattr(data, "network_serial", None),
        getattr(data, "lan_access_code", None),
    )


def delete_printer(printer_id: int) -> None:
    db.delete_stampante(printer_id)
