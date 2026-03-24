from __future__ import annotations

import datetime

import calculations
from backend.schemas import MarginiCalcolati, ProgettoCardData, ProgettoOut
from backend.repositories import finance, inventory, printers, projects


def get_summary() -> dict:
    project_items = projects.list_projects()
    logs = finance.list_print_logs()
    printer_items = printers.list_printers()
    spool_items = inventory.list_spools()
    fixed_costs = finance.list_fixed_costs()
    return calculations.calcola_riepilogo_finanziario(project_items, logs, printer_items, spool_items, fixed_costs)


def get_projects_with_margins() -> list[ProgettoCardData]:
    project_items = projects.list_projects()
    all_logs = finance.list_print_logs()
    printer_items = printers.list_printers()
    spool_items = inventory.list_spools()
    fixed_costs = finance.list_fixed_costs()

    result = []
    for project in project_items:
        project_logs = [log for log in all_logs if log["progetto_id"] == project["id"]]
        margins = calculations.calcola_margine_completo(project, project_logs, printer_items, spool_items, fixed_costs)
        result.append(
            ProgettoCardData(
                progetto=ProgettoOut(**project),
                calcoli=MarginiCalcolati(**margins),
            )
        )
    return result


def get_analytics(mode: str = "mese", mese: int | None = None, anno: int | None = None, dal: str | None = None, al: str | None = None) -> dict:
    today = datetime.date.today()

    if mode == "mese":
        selected_month = mese or today.month
        selected_year = anno or today.year
        date_from = datetime.date(selected_year, selected_month, 1)
        if selected_month == 12:
            date_to = datetime.date(selected_year, 12, 31)
        else:
            date_to = datetime.date(selected_year, selected_month + 1, 1) - datetime.timedelta(days=1)
    elif mode == "anno":
        selected_year = anno or today.year
        date_from = datetime.date(selected_year, 1, 1)
        date_to = datetime.date(selected_year, 12, 31)
    else:
        date_from = datetime.date.fromisoformat(dal) if dal else datetime.date(today.year, 1, 1)
        date_to = datetime.date.fromisoformat(al) if al else today

    return finance.get_dashboard_analytics(date_from.isoformat(), date_to.isoformat())


def get_project_cost_analysis() -> list[dict]:
    return finance.get_project_cost_analysis()
