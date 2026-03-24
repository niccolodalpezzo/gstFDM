from __future__ import annotations

import database as db


def create_allocation(source_type: str, source_id: int | None, descrizione: str,
                      costo_totale: float, quota_oraria: float, ore_da_spalmare: float) -> int:
    return db.add_farm_hourly_allocation(
        source_type=source_type,
        source_id=source_id,
        descrizione=descrizione,
        costo_totale=costo_totale,
        quota_oraria=quota_oraria,
        ore_da_spalmare=ore_da_spalmare,
    )


def list_allocations(only_active: bool = False) -> list[dict]:
    return db.list_farm_hourly_allocations(only_active=only_active)


def deactivate(alloc_id: int) -> None:
    db.deactivate_farm_hourly_allocation(alloc_id)


def deactivate_by_source(source_type: str, source_id: int) -> None:
    db.deactivate_farm_hourly_allocation_by_source(source_type, source_id)


def consume_hours(ore_stampa: float) -> None:
    db.consume_allocation_hours(ore_stampa)


def get_active_quota_sum() -> float:
    return db.get_active_extra_quota_per_hour()
