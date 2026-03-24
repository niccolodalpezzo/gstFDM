"""
cost_engine.py — Single source of truth per tutti i calcoli costi della PrintFarm.

Tutte le funzioni sono pure (nessun import da database):
- ricevono i dati già caricati come dict/list
- sono completamente testabili in isolamento
- vengono chiamate da: dashboard_service, log_service, project_service

Formula cost engine per ogni log stampa:
  costo_materiale      = (costo_kg / 1000) * grammi * density_multiplier
  costo_energia        = (consumo_w / 1000) * ore * costo_kwh
  costo_ammortamento   = quota_oraria * ore  (capped: 0 se ammortamento_attivo == False)
  quota_manutenzione   = sum(costo_std/soglia_ore * ore) per ogni template attivo
  quota_overhead       = (sum_costi_fissi / ore_mensili_farm) * ore
  quota_allocazioni    = sum(quota_oraria_allocazioni_attive + quota_oraria_spalmatura_attiva) * ore
  costo_accessori      = post_prod + extra + packaging
  costo_totale_log     = somma di tutti i precedenti

Formula progetto:
  costo_totale_progetto = sum(costi_log) + costo_progettazione + costo_extra_progetto
  costo_unitario        = costo_totale_progetto / quantita_da_produrre
  margine               = budget - costo_totale_progetto
  margine_perc          = margine / budget * 100
"""

from __future__ import annotations

import datetime
from typing import Optional


# ─── 1. Overhead / Costi Fissi ────────────────────────────────────────────────

def calculate_active_hourly_overhead(
    fixed_costs: list[dict],
    ore_mensili_farm: float,
    active_allocations: list[dict],
    active_spalmatura: list[dict],
) -> float:
    """
    Ritorna il tasso orario totale degli overhead (€/h) da applicare per ogni ora di stampa.

    Componenti:
    - sum(importo_mensile WHERE attivo=True) / ore_mensili_farm   [costi fissi]
    - sum(quota_oraria WHERE attiva=1)                            [farm_hourly_cost_allocations]
    - sum(quota_oraria_ricambi WHERE spalmatura_attiva=1)         [extraordinary_maintenance]

    active_allocations: record da farm_hourly_cost_allocations WHERE attiva=1
    active_spalmatura: record da extraordinary_maintenance WHERE spalmatura_attiva=1
    """
    fissi_mensili = sum(
        float(cf.get("importo_mensile") or 0.0)
        for cf in fixed_costs
        if cf.get("attivo")
    )
    fissi_quota = fissi_mensili / ore_mensili_farm if ore_mensili_farm > 0 else 0.0

    alloc_quota = sum(float(a.get("quota_oraria") or 0.0) for a in active_allocations)
    spalmatura_quota = sum(float(m.get("quota_oraria_ricambi") or 0.0) for m in active_spalmatura)

    return fissi_quota + alloc_quota + spalmatura_quota


def calculate_fixed_cost_hourly_rate(
    fixed_costs: list[dict],
    ore_mensili_farm: float,
) -> float:
    """Quota oraria dei soli costi fissi (senza allocazioni). Usata per KPI breakdown."""
    fissi_mensili = sum(
        float(cf.get("importo_mensile") or 0.0)
        for cf in fixed_costs
        if cf.get("attivo")
    )
    return fissi_mensili / ore_mensili_farm if ore_mensili_farm > 0 else 0.0


def calculate_allocation_hourly_rate(
    active_allocations: list[dict],
    active_spalmatura: list[dict],
) -> float:
    """Quota oraria delle sole allocazioni attive (senza costi fissi). Usata per KPI breakdown."""
    alloc_quota = sum(float(a.get("quota_oraria") or 0.0) for a in active_allocations)
    spalmatura_quota = sum(float(m.get("quota_oraria_ricambi") or 0.0) for m in active_spalmatura)
    return alloc_quota + spalmatura_quota


def calculate_maintenance_hourly_rate(active_templates: list[dict]) -> float:
    """Quota oraria totale della manutenzione ordinaria (€/h). Usata per KPI breakdown."""
    total = 0.0
    for t in active_templates:
        if not t.get("attiva", True):
            continue
        costo = float(t.get("costo_standard_intervento") or 0.0)
        soglia = float(t.get("soglia_ore_massima") or 0.0)
        if costo > 0 and soglia > 0:
            total += costo / soglia
    return total


# ─── 2. Quota Manutenzione Ordinaria ─────────────────────────────────────────

def calculate_ordinary_maintenance_quota(
    ore_stampa: float,
    active_templates: list[dict],
) -> float:
    """
    Calcola la quota costo manutenzione ordinaria per un dato numero di ore di stampa.

    Per ogni template attivo:
        quota_template = (costo_standard_intervento / soglia_ore_massima) * ore_stampa

    Ritorna 0.0 se costo_standard_intervento è 0 per tutti i template (backward compat).
    """
    if ore_stampa <= 0:
        return 0.0
    total = 0.0
    for t in active_templates:
        if not t.get("attiva", True):
            continue
        costo = float(t.get("costo_standard_intervento") or 0.0)
        soglia = float(t.get("soglia_ore_massima") or 0.0)
        if costo > 0 and soglia > 0:
            total += (costo / soglia) * ore_stampa
    return round(total, 6)


# ─── 3. Costo Singolo Log ─────────────────────────────────────────────────────

def calculate_log_cost(
    log: dict,
    stampante: dict,
    magazzino_item: dict,
    settings: dict,
    active_allocations: list[dict],
    active_spalmatura: list[dict],
    fixed_costs: list[dict],
    active_templates: list[dict],
    density_ratios: dict,
) -> dict:
    """
    Calcola il breakdown completo dei costi per un singolo log stampa.

    Parametri:
        log: record log_stampe (grammi_usati, tempo_minuti, costo_post_prod, costo_extra, costo_packaging)
        stampante: record stampanti
        magazzino_item: record magazzino (bobina usata)
        settings: dict con costo_kwh, ore_lavorative_mensili_farm
        active_allocations: farm_hourly_cost_allocations WHERE attiva=1
        active_spalmatura: extraordinary_maintenance WHERE spalmatura_attiva=1
                           (filtrati per printer_id quando possibile)
        fixed_costs: costi_fissi
        active_templates: maintenance_templates WHERE attiva=1
        density_ratios: {material_upper: multiplier} — {} per disabilitare density correction

    Ritorna dict con:
        ore_stampa, costo_materiale, costo_energia, costo_ammortamento,
        quota_manutenzione, quota_overhead, quota_allocazioni,
        costo_accessori, costo_totale_log, data_calcolo
    """
    kwh_cost = float(settings.get("costo_kwh") or 0.25)
    ore_mensili = float(settings.get("ore_lavorative_mensili_farm") or 160.0)

    ore_stampa = float(log.get("tempo_minuti") or 0.0) / 60.0
    grammi = float(log.get("grammi_usati") or 0.0)

    # Costo materiale (con density ratio)
    costo_kg = float(magazzino_item.get("costo_kg") or 0.0)
    materiale = str(magazzino_item.get("materiale") or "").upper()
    multiplier = density_ratios.get(materiale, 1.0) if density_ratios else 1.0
    costo_materiale = (costo_kg / 1000.0) * grammi * multiplier

    # Costo energia
    consumo_w = float(stampante.get("consumo_w") or 0.0)
    costo_energia = (consumo_w / 1000.0) * ore_stampa * kwh_cost

    # Ammortamento (capped: quota_oraria_nuova ?? quota_oraria_vecchia, stop se attivo=False)
    ammortamento_attivo = stampante.get("ammortamento_attivo")
    if ammortamento_attivo is None:
        ammortamento_attivo = True  # default: attivo per backward compat
    ammortamento_attivo = bool(ammortamento_attivo)

    if not ammortamento_attivo:
        costo_ammortamento = 0.0
    else:
        ammort_quota = stampante.get("ammortamento_quota_oraria")
        if ammort_quota is None:
            ammort_quota = stampante.get("ammortamento_orario") or 0.0
        costo_ammortamento = float(ammort_quota) * ore_stampa

    # Quota manutenzione ordinaria
    quota_manutenzione = calculate_ordinary_maintenance_quota(ore_stampa, active_templates)

    # Quota overhead (costi fissi / ore mensili farm)
    fissi_rate = calculate_fixed_cost_hourly_rate(fixed_costs, ore_mensili)
    quota_overhead = fissi_rate * ore_stampa

    # Quota allocazioni (farm-wide + printer spalmatura)
    alloc_rate = calculate_allocation_hourly_rate(active_allocations, active_spalmatura)
    quota_allocazioni = alloc_rate * ore_stampa

    # Costi accessori
    costo_accessori = (
        float(log.get("costo_post_prod") or 0.0)
        + float(log.get("costo_extra") or 0.0)
        + float(log.get("costo_packaging") or 0.0)
    )

    costo_totale_log = (
        costo_materiale
        + costo_energia
        + costo_ammortamento
        + quota_manutenzione
        + quota_overhead
        + quota_allocazioni
        + costo_accessori
    )

    data_calcolo = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return {
        "ore_stampa":          round(ore_stampa, 4),
        "costo_materiale":     round(costo_materiale, 4),
        "costo_energia":       round(costo_energia, 4),
        "costo_ammortamento":  round(costo_ammortamento, 4),
        "quota_manutenzione":  round(quota_manutenzione, 4),
        "quota_overhead":      round(quota_overhead, 4),
        "quota_allocazioni":   round(quota_allocazioni, 4),
        "costo_accessori":     round(costo_accessori, 4),
        "costo_totale_log":    round(costo_totale_log, 4),
        "data_calcolo":        data_calcolo,
    }


# ─── 4. Costo Progetto Completo ───────────────────────────────────────────────

def calculate_project_cost(
    progetto: dict,
    logs: list[dict],
    stampanti_list: list[dict],
    spools_list: list[dict],
    fixed_costs: list[dict],
    settings: dict,
    active_allocations: list[dict],
    active_spalmatura: list[dict],
    active_templates: list[dict],
    density_ratios: dict,
) -> dict:
    """
    Calcola il costo totale di un progetto con breakdown per categoria.

    Per ogni log:
    - Se snapshot_costo_totale_log non è NULL → usa i valori snapshot (storico stabile)
    - Altrimenti → calcola live con calculate_log_cost() (segnato come 'stimato')

    Ritorna dict con:
        id, nome, cliente, stato, budget,
        costo_materiali, costo_energia, costo_ammortamento,
        quota_manutenzione, quota_overhead, quota_allocazioni,
        costo_accessori, costo_progettazione, costo_extra_progetto,
        costo_totale, margine, margine_perc,
        ore_totali, n_stampe,
        quantita_da_produrre, costo_unitario, margine_unitario,
        has_estimated_logs
    """
    costo_orario_op = float(settings.get("costo_orario_post_prod") or 15.0)

    stampanti_map = {s["id"]: s for s in stampanti_list}
    spools_map = {s["id"]: s for s in spools_list}

    # Accumulatori per categoria
    tot_materiali = 0.0
    tot_energia = 0.0
    tot_ammortamento = 0.0
    tot_manutenzione = 0.0
    tot_overhead = 0.0
    tot_allocazioni = 0.0
    tot_accessori = 0.0
    ore_totali = 0.0
    has_estimated = False

    for log in logs:
        # Snapshot disponibile → usa storico
        if log.get("snapshot_costo_totale_log") is not None:
            tot_materiali   += float(log.get("snapshot_costo_materiale") or 0.0)
            tot_energia      += float(log.get("snapshot_costo_energia") or 0.0)
            tot_ammortamento += float(log.get("snapshot_costo_ammortamento") or 0.0)
            tot_manutenzione += float(log.get("snapshot_quota_manutenzione") or 0.0)
            tot_overhead     += float(log.get("snapshot_quota_overhead") or 0.0)
            tot_allocazioni  += float(log.get("snapshot_quota_allocazioni") or 0.0)
            # accessori non sono in snapshot separato — li calcoliamo dal log
            tot_accessori += (
                float(log.get("costo_post_prod") or 0.0)
                + float(log.get("costo_extra") or 0.0)
                + float(log.get("costo_packaging") or 0.0)
            )
            ore_totali += float(log.get("tempo_minuti") or 0.0) / 60.0
        else:
            # Calcolo live (log vecchi senza snapshot)
            stampante = stampanti_map.get(log.get("stampante_id"))
            spool = spools_map.get(log.get("magazzino_id"))
            if not stampante or not spool:
                continue

            # Per log vecchi: filtriamo active_spalmatura per printer_id se possibile
            printer_id = log.get("stampante_id")
            spalmatura_per_printer = [
                m for m in active_spalmatura
                if m.get("printer_id") == printer_id
            ] if printer_id else active_spalmatura

            breakdown = calculate_log_cost(
                log=log,
                stampante=stampante,
                magazzino_item=spool,
                settings=settings,
                active_allocations=active_allocations,
                active_spalmatura=spalmatura_per_printer,
                fixed_costs=fixed_costs,
                active_templates=active_templates,
                density_ratios=density_ratios,
            )
            tot_materiali   += breakdown["costo_materiale"]
            tot_energia      += breakdown["costo_energia"]
            tot_ammortamento += breakdown["costo_ammortamento"]
            tot_manutenzione += breakdown["quota_manutenzione"]
            tot_overhead     += breakdown["quota_overhead"]
            tot_allocazioni  += breakdown["quota_allocazioni"]
            tot_accessori    += breakdown["costo_accessori"]
            ore_totali       += breakdown["ore_stampa"]
            has_estimated = True

    # Costi commessa
    ore_prog = float(progetto.get("ore_progettazione") or 0.0)
    costo_progettazione = ore_prog * costo_orario_op
    costo_extra_progetto = float(progetto.get("costo_extra_progetto") or 0.0)

    costo_totale = (
        tot_materiali + tot_energia + tot_ammortamento
        + tot_manutenzione + tot_overhead + tot_allocazioni
        + tot_accessori + costo_progettazione + costo_extra_progetto
    )

    budget = float(progetto.get("budget") or 0.0)
    margine = budget - costo_totale
    margine_perc = (margine / budget * 100.0) if budget > 0 else 0.0

    quantita = int(progetto.get("quantita_da_produrre") or 1)
    quantita = max(1, quantita)
    costo_unitario = costo_totale / quantita
    margine_unitario = margine / quantita

    return {
        "id":                    int(progetto.get("id") or 0),
        "nome":                  str(progetto.get("nome") or ""),
        "cliente":               str(progetto.get("cliente") or ""),
        "stato":                 str(progetto.get("stato") or ""),
        "budget":                round(budget, 2),
        "costo_materiali":       round(tot_materiali, 2),
        "costo_energia":         round(tot_energia, 2),
        "costo_ammortamento":    round(tot_ammortamento, 2),
        "quota_manutenzione":    round(tot_manutenzione, 2),
        "quota_overhead":        round(tot_overhead, 2),
        "quota_allocazioni":     round(tot_allocazioni, 2),
        "costo_accessori":       round(tot_accessori, 2),
        "costo_progettazione":   round(costo_progettazione + costo_extra_progetto, 2),
        "costo_extra_progetto":  round(costo_extra_progetto, 2),
        "costo_totale":          round(costo_totale, 2),
        "margine":               round(margine, 2),
        "margine_perc":          round(margine_perc, 1),
        "ore_totali":            round(ore_totali, 1),
        "n_stampe":              len(logs),
        "quantita_da_produrre":  quantita,
        "costo_unitario":        round(costo_unitario, 4),
        "margine_unitario":      round(margine_unitario, 4),
        "has_estimated_logs":    has_estimated,
    }
