from __future__ import annotations

from backend.repositories import finance, inventory, printers as printer_repo
from backend.repositories import allocations as alloc_repo
from backend.services import allocation_service, maintenance_service, settings_service
from backend.services import cost_engine
import database as db


def list_print_logs(project_id: int | None = None) -> list[dict]:
    return finance.list_print_logs(project_id)


def create_print_log(data) -> dict | None:
    spool = inventory.get_spool_by_code(data.codice_bobina)
    if not spool:
        return None

    # Step 1: persiste il record log (comportamento invariato)
    created = finance.create_print_log(data, spool["id"])

    # Step 2: consuma grammi bobina (comportamento invariato)
    inventory.consume_spool_grams(spool["id"], data.grammi_usati)

    ore_stampa = float(data.tempo_minuti) / 60.0

    if ore_stampa > 0:
        # Step 3: consuma ore allocation attive (comportamento invariato)
        # gestisce sia farm_hourly_cost_allocations che extraordinary_maintenance
        allocation_service.consume_hours(ore_stampa)

        # Step 4: decrementa ammortamento residuo stampante (NUOVO)
        db.decrement_ammortamento(data.stampante_id, ore_stampa)

        # Step 5: calcola e salva snapshot costi (NUOVO)
        _save_snapshot(created, data, spool)

    return created


def _save_snapshot(created: dict, data, spool: dict) -> None:
    """Calcola e persiste lo snapshot dei costi per il log appena creato.
    Wrappato in try/except: un errore qui non deve mai bloccare la creazione del log.
    """
    try:
        settings = settings_service.get_settings()
        stampante = printer_repo.get_printer(data.stampante_id)
        if stampante is None:
            return

        fixed_costs = finance.list_fixed_costs()

        # Allocazioni farm-wide
        active_allocs = alloc_repo.list_allocations(only_active=True)

        # Spalmatura straordinaria filtrata per questa stampante specifica
        active_spalmatura = maintenance_service.get_active_spalmatura(printer_id=data.stampante_id)

        # Template manutenzione ordinaria attivi
        active_templates = maintenance_service.list_templates(only_active=True)

        # Density ratios
        density_rows = db.get_material_density_ratios()
        density_ratios = {r["material"].upper(): float(r["multiplier"]) for r in density_rows}

        log_dict = {
            "grammi_usati":    data.grammi_usati,
            "tempo_minuti":    data.tempo_minuti,
            "costo_post_prod": data.costo_post_prod,
            "costo_extra":     data.costo_extra,
            "costo_packaging": data.costo_packaging,
        }

        breakdown = cost_engine.calculate_log_cost(
            log=log_dict,
            stampante=stampante,
            magazzino_item=spool,
            settings=settings,
            active_allocations=active_allocs,
            active_spalmatura=active_spalmatura,
            fixed_costs=fixed_costs,
            active_templates=active_templates,
            density_ratios=density_ratios,
        )

        db.save_log_snapshot(created["id"], breakdown)

    except Exception:
        # Non bloccare mai la creazione del log per un errore di snapshot
        pass
