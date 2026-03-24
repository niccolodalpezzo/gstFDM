from __future__ import annotations

import calculations
import reports
from backend.repositories import finance, inventory, printers, projects


def list_projects() -> list[dict]:
    return projects.list_projects()


def create_project(data) -> dict | None:
    return projects.create_project(data)


def update_project(project_id: int, data) -> dict | None:
    return projects.update_project(project_id, data)


def delete_project(project_id: int) -> None:
    projects.delete_project(project_id)


def get_project(project_id: int) -> dict | None:
    return projects.get_project(project_id)


def generate_project_report(project_id: int) -> tuple[str, str] | None:
    project = projects.get_project(project_id)
    if not project:
        return None

    logs = finance.list_print_logs(project_id)
    printer_items = printers.list_printers()
    spool_items = inventory.list_spools()
    fixed_costs = finance.list_fixed_costs()
    margins = calculations.calcola_margine_completo(project, logs, printer_items, spool_items, fixed_costs)
    filepath = reports.generate_project_report(project, margins)
    return filepath, project["nome"]
