from __future__ import annotations

from backend.repositories.base import dataframe_to_records
import database as db


# ─── Templates ────────────────────────────────────────────────────────────────

def list_templates(only_active: bool = False) -> list[dict]:
    return dataframe_to_records(db.get_maintenance_templates(only_active=only_active))


def get_template(template_id: int) -> dict | None:
    records = dataframe_to_records(db.get_maintenance_templates())
    return next((r for r in records if r["id"] == template_id), None)


def create_template(data) -> dict | None:
    new_id = db.add_maintenance_template(
        nome=data.nome,
        descrizione=data.descrizione,
        soglia_ore_massima=data.soglia_ore_massima,
        ordine_visualizzazione=data.ordine_visualizzazione,
        attiva=data.attiva,
        costo_standard_intervento=getattr(data, "costo_standard_intervento", 0.0),
    )
    return get_template(new_id)


def update_template(template_id: int, data) -> dict | None:
    db.update_maintenance_template(
        template_id=template_id,
        nome=data.nome,
        descrizione=data.descrizione,
        soglia_ore_massima=data.soglia_ore_massima,
        ordine_visualizzazione=data.ordine_visualizzazione,
        attiva=data.attiva,
        costo_standard_intervento=getattr(data, "costo_standard_intervento", 0.0),
    )
    return get_template(template_id)


def delete_template(template_id: int) -> None:
    db.delete_maintenance_template(template_id)


# ─── Printer maintenance state ────────────────────────────────────────────────

def list_printer_states(printer_id: int) -> list[dict]:
    return dataframe_to_records(db.get_printer_maintenance_states(printer_id=printer_id))


def upsert_state(printer_id: int, template_id: int, last_done_runtime_hours: float,
                 last_done_at: str | None, note: str) -> None:
    db.upsert_printer_maintenance_state(
        printer_id=printer_id,
        template_id=template_id,
        last_done_runtime_hours=last_done_runtime_hours,
        last_done_at=last_done_at,
        note=note,
    )


# ─── Extraordinary ────────────────────────────────────────────────────────────

def list_extraordinary(printer_id: int | None = None) -> list[dict]:
    return dataframe_to_records(db.get_extraordinary_maintenance(printer_id=printer_id))


def create_extraordinary(printer_id, descrizione_problema, giorni_fermo,
                          componenti_json, note, costo_totale,
                          ore_print_farm_da_spalmare=None,
                          quota_oraria_ricambi=0.0,
                          ore_residue_da_spalmare=None,
                          spalmatura_attiva=False) -> int:
    return db.add_extraordinary_maintenance(
        printer_id=printer_id,
        descrizione_problema=descrizione_problema,
        giorni_fermo=giorni_fermo,
        componenti_json=componenti_json,
        note=note,
        costo_totale=costo_totale,
        ore_print_farm_da_spalmare=ore_print_farm_da_spalmare,
        quota_oraria_ricambi=quota_oraria_ricambi,
        ore_residue_da_spalmare=ore_residue_da_spalmare,
        spalmatura_attiva=spalmatura_attiva,
    )


def set_extraordinary_spesa(maint_id: int, spesa_id: int) -> None:
    db.set_extraordinary_maintenance_spesa(maint_id, spesa_id)


def delete_extraordinary(maint_id: int) -> None:
    db.delete_extraordinary_maintenance(maint_id)
