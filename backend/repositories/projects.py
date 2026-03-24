from __future__ import annotations

from backend.repositories.base import dataframe_to_records, last_record
import database as db


def list_projects() -> list[dict]:
    return dataframe_to_records(db.get_progetti())


def get_project(project_id: int) -> dict | None:
    return next((project for project in list_projects() if project["id"] == project_id), None)


def create_project(data) -> dict | None:
    db.add_progetto(
        data.nome,
        data.cliente,
        data.budget,
        data.stato,
        data.quantita_da_produrre,
        data.ore_progettazione,
        data.costo_extra_progetto,
        data.cliente_id,
    )
    return last_record(db.get_progetti())


def update_project(project_id: int, data) -> dict | None:
    db.update_progetto(
        project_id,
        data.nome,
        data.cliente,
        data.budget,
        data.stato,
        data.quantita_da_produrre,
        data.ore_progettazione,
        data.costo_extra_progetto,
        data.cliente_id,
    )
    return get_project(project_id)


def delete_project(project_id: int) -> None:
    db.delete_progetto(project_id)
