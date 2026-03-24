from __future__ import annotations

from backend.repositories import allocations as repo
from backend.services import settings_service


def create_allocation(
    source_type: str,
    source_id: int | None,
    descrizione: str,
    costo_totale: float,
    ore_da_spalmare: float,
) -> dict | None:
    """
    Crea una farm_hourly_cost_allocation attiva.

    source_type: 'ordinary_maintenance_labor' | 'generic_component'
    ore_da_spalmare: tipicamente ore_lavorative_mensili_farm dai settings

    Ritorna None senza creare nulla se costo_totale <= 0 o ore_da_spalmare <= 0.
    """
    if costo_totale <= 0 or ore_da_spalmare <= 0:
        return None

    quota_oraria = round(costo_totale / ore_da_spalmare, 6)

    alloc_id = repo.create_allocation(
        source_type=source_type,
        source_id=source_id,
        descrizione=descrizione,
        costo_totale=costo_totale,
        quota_oraria=quota_oraria,
        ore_da_spalmare=ore_da_spalmare,
    )

    allocations = repo.list_allocations()
    return next((a for a in allocations if a["id"] == alloc_id), None)


def deactivate_component_allocation(component_id: int) -> None:
    """Chiude l'allocation collegata a un componente (quando spalma_costo_farm viene disattivato o componente eliminato)."""
    repo.deactivate_by_source("generic_component", component_id)


def consume_hours(ore_stampa: float) -> None:
    """
    Decrementa le ore residue da tutte le allocation attive.
    Da chiamare dopo ogni registrazione di un print log.
    """
    if ore_stampa > 0:
        repo.consume_hours(ore_stampa)


def get_active_quota_sum() -> float:
    """Somma delle quota_oraria di tutte le allocation attive (nuove + straordinarie)."""
    return repo.get_active_quota_sum()


def list_allocations(only_active: bool = False) -> list[dict]:
    return repo.list_allocations(only_active=only_active)
