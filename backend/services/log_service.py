from __future__ import annotations

from backend.repositories import finance, inventory
from backend.services import allocation_service


def list_print_logs(project_id: int | None = None) -> list[dict]:
    return finance.list_print_logs(project_id)


def create_print_log(data) -> dict | None:
    spool = inventory.get_spool_by_code(data.codice_bobina)
    if not spool:
        return None

    created = finance.create_print_log(data, spool["id"])
    inventory.consume_spool_grams(spool["id"], data.grammi_usati)

    # Consuma le ore residue dalle allocation attive
    ore_stampa = float(data.tempo_minuti) / 60.0
    if ore_stampa > 0:
        allocation_service.consume_hours(ore_stampa)

    return created
