from __future__ import annotations

from backend.repositories.base import dataframe_to_records, last_record
import database as db


def list_spools() -> list[dict]:
    return dataframe_to_records(db.get_magazzino())


def get_spool(spool_id: int) -> dict | None:
    return next((spool for spool in list_spools() if spool["id"] == spool_id), None)


def create_spool(data) -> dict | None:
    new_id = db.add_magazzino(
        data.marca,
        data.materiale,
        data.colore,
        data.costo_kg,
        data.grammi_residui,
        data.stato,
        data.quantita_stock,
        data.fornitore_id,
    )
    return get_spool(new_id)


def update_spool(spool_id: int, data) -> dict | None:
    db.update_magazzino_details(
        spool_id,
        data.marca,
        data.materiale,
        data.colore,
        data.costo_kg,
        data.grammi_residui,
        data.quantita_stock,
        data.fornitore_id,
    )
    return get_spool(spool_id)


def update_spool_gross_weight(spool_id: int, gross_weight: float, net_weight: float) -> dict | None:
    db.update_gross_weight(spool_id, gross_weight, net_weight)
    return get_spool(spool_id)


def delete_spool(spool_id: int) -> None:
    db.delete_magazzino(spool_id)


def activate_spool(spool_id: int) -> str | None:
    return db.attiva_bobina_nuova(spool_id)


def get_spool_by_code(code: str) -> dict | None:
    spool = db.get_bobina_by_codice(code)
    if not spool:
        return None
    return {key: (None if value != value else value) for key, value in spool.items()}


def consume_spool_grams(spool_id: int, grams: float) -> None:
    db.update_magazzino_grammi(spool_id, grams)


def list_component_replacements() -> list[dict]:
    return db.get_component_replacements()


def get_component_replacement(component_id: int) -> dict | None:
    return next((item for item in list_component_replacements() if item["id"] == component_id), None)


def create_component_replacement(
    data=None,
    *,
    name: str = "",
    material: str = "",
    stampante_ids: list[int] | None = None,
    compatibility_label: str = "",
    dimensions: str = "",
    installed_date=None,
    notes: str = "",
    tipo_pezzo: str = "Altro",
    manufacturer: str = "",
    part_number: str = "",
    stock_quantity: int = 0,
    minimum_stock: int = 0,
    unit_cost: float = 0.0,
    official: bool = True,
    nozzle_diameter: float | None = None,
    bed_size_x: float | None = None,
    bed_size_y: float | None = None,
    compatibility_printers: list[dict] | None = None,
    compatibility_beds: list[dict] | None = None,
    compatibility_multicolor: list[dict] | None = None,
) -> dict | None:
    if data is not None:
        name = data.name
        manufacturer = getattr(data, "manufacturer", "")
        part_number = getattr(data, "part_number", "")
        material = data.material
        tipo_pezzo = data.tipo_pezzo
        stampante_ids = list(data.stampante_ids)
        compatibility_label = data.compatibility_label
        dimensions = data.dimensions
        installed_date = data.installed_date
        stock_quantity = data.stock_quantity
        minimum_stock = data.minimum_stock
        unit_cost = data.unit_cost
        official = data.official
        nozzle_diameter = data.nozzle_diameter
        bed_size_x = data.bed_size_x
        bed_size_y = data.bed_size_y
        compatibility_printers = [item.model_dump() for item in data.compatibility_printers]
        compatibility_beds = [item.model_dump() for item in data.compatibility_beds]
        compatibility_multicolor = [item.model_dump() for item in data.compatibility_multicolor]
        notes = data.notes
        spalma_costo_farm = getattr(data, "spalma_costo_farm", False)

    uid = db.add_component_replacement(
        name,
        material,
        stampante_ids or [],
        compatibility_label,
        dimensions,
        installed_date,
        notes,
        tipo_pezzo,
        manufacturer,
        part_number,
        stock_quantity,
        minimum_stock,
        unit_cost,
        official,
        nozzle_diameter,
        bed_size_x,
        bed_size_y,
        compatibility_printers,
        compatibility_beds,
        compatibility_multicolor,
        spalma_costo_farm,
    )
    return next((item for item in list_component_replacements() if item["asset_uid"] == uid), None)


def delete_component_replacement(component_id: int) -> None:
    db.delete_component_replacement(component_id)


def list_generic_assets() -> list[dict]:
    return db.get_generic_assets()


def create_generic_asset(data) -> dict | None:
    db.add_generic_asset(data.name, data.category, data.quantity, data.unit, data.unit_cost, data.notes)
    items = list_generic_assets()
    return items[-1] if items else None


def delete_generic_asset(asset_id: int) -> None:
    db.delete_generic_asset(asset_id)


def list_tare_overrides() -> list[dict]:
    return dataframe_to_records(db.get_tare_overrides())


def upsert_tare_override(marca: str, materiale: str, tare_g: float) -> None:
    db.set_tare_override(marca, materiale, tare_g)


def delete_tare_override(marca: str, materiale: str) -> None:
    db.delete_tare_override(marca, materiale)


def list_material_density_ratios() -> list[dict]:
    return db.get_material_density_ratios()


def upsert_material_density_ratio(material: str, multiplier: float, notes: str) -> None:
    db.upsert_material_density_ratio(material, multiplier, notes)


def delete_material_density_ratio(material: str) -> None:
    db.delete_material_density_ratio(material)
