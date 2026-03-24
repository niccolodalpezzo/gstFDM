from __future__ import annotations

from backend.repositories.base import dataframe_to_records, first_record, last_record
import database as db


def list_fixed_costs() -> list[dict]:
    records = dataframe_to_records(db.get_costi_fissi())
    for record in records:
        record["attivo"] = bool(record["attivo"])
        record.setdefault("data_inizio", None)
        record.setdefault("frequenza", "Monthly")
    return records


def get_fixed_cost(cost_id: int) -> dict | None:
    return next((record for record in list_fixed_costs() if record["id"] == cost_id), None)


def create_fixed_cost(data) -> dict | None:
    db.add_costo_fisso(data.nome, data.importo_mensile, data.attivo, data.data_inizio, data.frequenza)
    return last_record(db.get_costi_fissi())


def toggle_fixed_cost(cost_id: int, enabled: bool) -> dict | None:
    db.toggle_costo_fisso(cost_id, enabled)
    return get_fixed_cost(cost_id)


def delete_fixed_cost(cost_id: int) -> None:
    db.delete_costo_fisso(cost_id)


def list_one_off_expenses() -> list[dict]:
    return dataframe_to_records(db.get_spese_una_tantum())


def create_one_off_expense(data) -> dict | None:
    db.add_spesa_una_tantum(data.descrizione, data.importo, data.data, data.note, data.fornitore_id)
    return first_record(db.get_spese_una_tantum())


def delete_one_off_expense(expense_id: int) -> None:
    db.delete_spesa_una_tantum(expense_id)


def list_print_logs(project_id: int | None = None) -> list[dict]:
    return dataframe_to_records(db.get_log_stampe(progetto_id=project_id))


def create_print_log(data, spool_id: int) -> dict | None:
    db.add_log_stampa(
        data.progetto_id,
        data.stampante_id,
        spool_id,
        data.grammi_usati,
        data.tempo_minuti,
        data.costo_post_prod,
        data.costo_extra,
        data.costo_packaging,
        data.data,
    )
    return last_record(db.get_log_stampe(progetto_id=data.progetto_id))


def get_dashboard_analytics(date_from: str, date_to: str) -> dict:
    return db.get_dashboard_analytics(date_from, date_to)


def get_project_cost_analysis() -> list[dict]:
    return db.get_project_cost_analysis()
