from __future__ import annotations

import datetime

import calculations
from backend.schemas import MarginiCalcolati, ProgettoCardData, ProgettoOut
from backend.repositories import finance, inventory, printers, projects
from backend.repositories import allocations as alloc_repo
from backend.services import maintenance_service, settings_service
from backend.services import cost_engine
import database as db


def _load_cost_context() -> dict:
    """Carica tutti i dati necessari per i calcoli costi in un'unica passata."""
    return {
        "settings":           settings_service.get_settings(),
        "printer_items":      printers.list_printers(),
        "spool_items":        inventory.list_spools(),
        "fixed_costs":        finance.list_fixed_costs(),
        "active_allocs":      alloc_repo.list_allocations(only_active=True),
        "active_spalmatura":  maintenance_service.get_active_spalmatura(),
        "active_templates":   maintenance_service.list_templates(only_active=True),
        "density_ratios":     {r["material"].upper(): float(r["multiplier"])
                               for r in db.get_material_density_ratios()},
    }


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
    ctx = _load_cost_context()

    result = []
    for project in project_items:
        project_logs = [log for log in all_logs if log["progetto_id"] == project["id"]]
        analysis = cost_engine.calculate_project_cost(
            progetto=project,
            logs=project_logs,
            stampanti_list=ctx["printer_items"],
            spools_list=ctx["spool_items"],
            fixed_costs=ctx["fixed_costs"],
            settings=ctx["settings"],
            active_allocations=ctx["active_allocs"],
            active_spalmatura=ctx["active_spalmatura"],
            active_templates=ctx["active_templates"],
            density_ratios=ctx["density_ratios"],
        )
        margini = MarginiCalcolati(
            costo_3d=analysis["costo_materiali"] + analysis["costo_energia"] + analysis["costo_ammortamento"],
            quota_fissi=analysis["quota_overhead"] + analysis["quota_allocazioni"],
            costi_accessori=analysis["costo_accessori"],
            costo_progettazione=analysis["costo_progettazione"],
            costo_totale=analysis["costo_totale"],
            margine_assoluto=analysis["margine"],
            margine_perc=analysis["margine_perc"],
            ore_totali=analysis["ore_totali"],
            costo_unitario=analysis["costo_unitario"],
            margine_unitario=analysis["margine_unitario"],
            quota_manutenzione=analysis["quota_manutenzione"],
            has_estimated_logs=analysis["has_estimated_logs"],
        )
        result.append(
            ProgettoCardData(
                progetto=ProgettoOut(**project),
                calcoli=margini,
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
    """
    Analisi costi per tutti i progetti — usa cost_engine come unica logica.
    Questa funzione è chiamata da /api/dashboard/project-costs (pricing tab).
    """
    project_items = projects.list_projects()
    all_logs = finance.list_print_logs()
    ctx = _load_cost_context()

    result = []
    for project in project_items:
        project_logs = [l for l in all_logs if l["progetto_id"] == project["id"]]
        analysis = cost_engine.calculate_project_cost(
            progetto=project,
            logs=project_logs,
            stampanti_list=ctx["printer_items"],
            spools_list=ctx["spool_items"],
            fixed_costs=ctx["fixed_costs"],
            settings=ctx["settings"],
            active_allocations=ctx["active_allocs"],
            active_spalmatura=ctx["active_spalmatura"],
            active_templates=ctx["active_templates"],
            density_ratios=ctx["density_ratios"],
        )
        result.append(analysis)
    return result
