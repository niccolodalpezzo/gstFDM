from __future__ import annotations

from typing import Any


def _round_money(value: float) -> float:
    return round(float(value or 0.0), 4)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _weighted_average(rows: list[dict], value_key: str, weight_key: str, fallback: float) -> float:
    total_weight = sum(_safe_float(row.get(weight_key)) for row in rows)
    if total_weight <= 0:
        return fallback
    return sum(_safe_float(row.get(value_key)) * _safe_float(row.get(weight_key)) for row in rows) / total_weight


def _cap_hourly_cost(
    ore_stampa: float,
    quota_oraria: float,
    importo_residuo: float | None = None,
    ore_residue: float | None = None,
) -> dict[str, float]:
    ore_effettive = ore_stampa
    theoretical = quota_oraria * ore_stampa

    if ore_residue is not None:
        ore_effettive = min(ore_effettive, max(0.0, ore_residue))

    effective = quota_oraria * ore_effettive
    if importo_residuo is not None:
        effective = min(effective, max(0.0, importo_residuo))

    return {
        "ore_effettive": ore_effettive,
        "costo_teorico": theoretical,
        "costo_effettivo": max(0.0, effective),
    }


def calculate_quote_breakdown(
    *,
    quote: dict,
    material_rows: list[dict],
    post_rows: list[dict],
    component_rows: list[dict],
    settings: dict,
    printer: dict,
    fixed_costs: list[dict],
    ordinary_templates: list[dict],
    extraordinary_allocations: list[dict],
    structure_costs: list[dict],
) -> dict[str, Any]:
    warnings: list[str] = []
    ore_stampa = max(0.0, _safe_float(quote.get("ore_stampa")))
    minuti_setup = max(0.0, _safe_float(quote.get("minuti_setup")))
    margine_lordo_perc = _safe_float(quote.get("margine_lordo_perc"))

    costo_kwh = _safe_float(settings.get("costo_kwh"), 0.25)
    costo_orario_manodopera = _safe_float(
        settings.get("costo_orario_manodopera", settings.get("costo_orario_post_prod")),
        15.0,
    )
    ore_mensili_farm = _safe_float(settings.get("ore_lavorative_mensili_farm"), 160.0)

    normalized_materials: list[dict[str, Any]] = []
    for index, row in enumerate(material_rows, start=1):
        grammi_modello = max(0.0, _safe_float(row.get("grammi_modello")))
        scarto_perc = _safe_float(row.get("scarto_perc"))
        grammi_totali = grammi_modello * (1.0 + scarto_perc / 100.0)
        costo_kg = max(0.0, _safe_float(row.get("costo_kg_snapshot")))
        costo_totale = (grammi_totali / 1000.0) * costo_kg

        normalized_materials.append({
            "id": int(row.get("id") or index),
            "preventivo_id": int(row.get("preventivo_id") or 0),
            "magazzino_id": row.get("magazzino_id"),
            "materiale_nome_snapshot": row.get("materiale_nome_snapshot") or "",
            "marca_snapshot": row.get("marca_snapshot") or "",
            "colore_snapshot": row.get("colore_snapshot") or "",
            "costo_kg_snapshot": _round_money(costo_kg),
            "grammi_modello": _round_money(grammi_modello),
            "scarto_perc": _round_money(scarto_perc),
            "grammi_totali": _round_money(grammi_totali),
            "energy_multiplier_snapshot": _round_money(_safe_float(row.get("energy_multiplier_snapshot"), 1.0)),
            "risk_perc_snapshot": _round_money(_safe_float(row.get("risk_perc_snapshot"), 0.0)),
            "costo_totale": _round_money(costo_totale),
        })

    energy_multiplier_eff = _weighted_average(
        normalized_materials,
        "energy_multiplier_snapshot",
        "grammi_totali",
        1.0,
    )
    rischio_materiali_base = _weighted_average(
        normalized_materials,
        "risk_perc_snapshot",
        "grammi_totali",
        0.0,
    )

    costo_materiali = sum(row["costo_totale"] for row in normalized_materials)

    consumo_w = max(0.0, _safe_float(printer.get("consumo_w")))
    kw_effettivi = (consumo_w * energy_multiplier_eff) / 1000.0
    costo_energia = kw_effettivi * ore_stampa * costo_kwh

    costo_setup = (minuti_setup / 60.0) * costo_orario_manodopera

    normalized_post: list[dict[str, Any]] = []
    for index, row in enumerate(post_rows, start=1):
        minuti = row.get("minuti")
        costo_manual = row.get("costo_manual")
        minuti_val = None if minuti is None else max(0.0, _safe_float(minuti))
        costo_manual_val = None if costo_manual is None else max(0.0, _safe_float(costo_manual))
        if minuti_val is not None and minuti_val > 0:
            costo_totale = (minuti_val / 60.0) * costo_orario_manodopera
        else:
            costo_totale = costo_manual_val or 0.0
        normalized_post.append({
            "id": int(row.get("id") or index),
            "preventivo_id": int(row.get("preventivo_id") or 0),
            "descrizione": row.get("descrizione") or "",
            "minuti": minuti_val,
            "costo_manual": costo_manual_val,
            "costo_totale": _round_money(costo_totale),
        })
    costo_post_produzione = sum(row["costo_totale"] for row in normalized_post)

    normalized_components: list[dict[str, Any]] = []
    for index, row in enumerate(component_rows, start=1):
        quantita = max(0.0, _safe_float(row.get("quantita"), 1.0))
        costo_unitario = max(0.0, _safe_float(row.get("costo_unitario")))
        costo_totale = quantita * costo_unitario
        normalized_components.append({
            "id": int(row.get("id") or index),
            "preventivo_id": int(row.get("preventivo_id") or 0),
            "descrizione": row.get("descrizione") or "",
            "quantita": _round_money(quantita),
            "costo_unitario": _round_money(costo_unitario),
            "costo_totale": _round_money(costo_totale),
        })
    costo_componenti_extra = sum(row["costo_totale"] for row in normalized_components)

    costo_packing = max(0.0, _safe_float(quote.get("costo_packing")))
    costo_spedizione = max(0.0, _safe_float(quote.get("costo_spedizione")))
    costo_progettazione = max(0.0, _safe_float(quote.get("costo_progettazione")))
    costo_extra_manual = max(0.0, _safe_float(quote.get("costo_extra_manual")))

    totale_costi_fissi_mensili = sum(
        _safe_float(cost.get("importo_mensile"))
        for cost in fixed_costs
        if cost.get("attivo")
    )
    quota_costi_fissi_oraria = totale_costi_fissi_mensili / ore_mensili_farm if ore_mensili_farm > 0 else 0.0
    costo_costi_fissi = quota_costi_fissi_oraria * ore_stampa

    quota_manutenzione_ordinaria_oraria = 0.0
    for template in ordinary_templates:
        if not template.get("attiva", True):
            continue
        costo_std = _safe_float(template.get("costo_standard_intervento"))
        soglia = _safe_float(template.get("soglia_ore_massima"))
        if costo_std > 0 and soglia > 0:
            quota_manutenzione_ordinaria_oraria += costo_std / soglia
    costo_manutenzione_ordinaria = quota_manutenzione_ordinaria_oraria * ore_stampa

    quota_manutenzione_straordinaria_oraria = 0.0
    costo_manutenzione_straordinaria = 0.0
    extraordinary_capped = False
    for allocation in extraordinary_allocations:
        quota = max(0.0, _safe_float(allocation.get("quota_oraria_ricambi")))
        ore_residue = allocation.get("ore_residue_da_spalmare")
        capped = _cap_hourly_cost(
            ore_stampa=ore_stampa,
            quota_oraria=quota,
            ore_residue=None if ore_residue is None else _safe_float(ore_residue),
        )
        quota_manutenzione_straordinaria_oraria += quota
        costo_manutenzione_straordinaria += capped["costo_effettivo"]
        if capped["costo_effettivo"] + 0.0001 < capped["costo_teorico"]:
            extraordinary_capped = True

    ammortamento_quota_oraria = _safe_float(
        printer.get("ammortamento_quota_oraria", printer.get("ammortamento_orario")),
        0.0,
    )
    ammortamento_attivo = bool(printer.get("ammortamento_attivo", True))
    ammortamento_residuo = None if printer.get("ammortamento_residuo_euro") is None else _safe_float(printer.get("ammortamento_residuo_euro"))
    if ammortamento_attivo and ammortamento_quota_oraria > 0:
        capped_ammortamento = _cap_hourly_cost(
            ore_stampa=ore_stampa,
            quota_oraria=ammortamento_quota_oraria,
            importo_residuo=ammortamento_residuo,
        )
        costo_ammortamento = capped_ammortamento["costo_effettivo"]
        if costo_ammortamento + 0.0001 < capped_ammortamento["costo_teorico"]:
            warnings.append("Ammortamento limitato dal residuo disponibile.")
    else:
        costo_ammortamento = 0.0

    quota_straordinari_struttura_oraria = 0.0
    costo_straordinari_struttura = 0.0
    structure_capped = False
    for row in structure_costs:
        if not row.get("attivo", True):
            continue
        quota = max(0.0, _safe_float(row.get("quota_oraria")))
        importo_residuo = _safe_float(row.get("importo_residuo"))
        ore_residue_raw = row.get("ore_da_spalmare_residue")
        ore_residue = None if ore_residue_raw is None else _safe_float(ore_residue_raw)
        capped = _cap_hourly_cost(
            ore_stampa=ore_stampa,
            quota_oraria=quota,
            importo_residuo=importo_residuo,
            ore_residue=ore_residue,
        )
        quota_straordinari_struttura_oraria += quota
        costo_straordinari_struttura += capped["costo_effettivo"]
        if capped["costo_effettivo"] + 0.0001 < capped["costo_teorico"]:
            structure_capped = True

    rischio_stampante = _safe_float(printer.get("risk_perc_base"))
    rischio_override = _safe_float(quote.get("override_rischio_perc"))
    rischio_totale_perc = max(0.0, rischio_stampante + rischio_materiali_base + rischio_override)
    base_rischio = (
        costo_materiali
        + costo_energia
        + costo_setup
        + costo_costi_fissi
        + costo_manutenzione_ordinaria
        + costo_manutenzione_straordinaria
        + costo_ammortamento
        + costo_straordinari_struttura
    )
    costo_rischio = base_rischio * rischio_totale_perc / 100.0

    costo_pieno = (
        costo_materiali
        + costo_energia
        + costo_setup
        + costo_post_produzione
        + costo_componenti_extra
        + costo_packing
        + costo_spedizione
        + costo_costi_fissi
        + costo_manutenzione_ordinaria
        + costo_manutenzione_straordinaria
        + costo_ammortamento
        + costo_straordinari_struttura
        + costo_progettazione
        + costo_rischio
        + costo_extra_manual
    )

    denominator = 1.0 - margine_lordo_perc / 100.0
    if denominator <= 0:
        warnings.append("Margine lordo non valido: il prezzo finale e stato limitato.")
        denominator = 0.0001
    prezzo_finale = costo_pieno / denominator
    utile_lordo = prezzo_finale - costo_pieno

    if extraordinary_capped:
        warnings.append("Manutenzione straordinaria limitata dalle ore residue disponibili.")
    if structure_capped:
        warnings.append("Costi straordinari struttura limitati dal residuo disponibile.")
    if ore_mensili_farm <= 0:
        warnings.append("Ore lavorative mensili farm non valide: costi fissi orari azzerati.")

    return {
        "materiali": normalized_materials,
        "post_produzione": normalized_post,
        "componenti_extra": normalized_components,
        "breakdown": {
            "costo_materiali": _round_money(costo_materiali),
            "costo_energia": _round_money(costo_energia),
            "costo_setup": _round_money(costo_setup),
            "costo_post_produzione": _round_money(costo_post_produzione),
            "costo_componenti_extra": _round_money(costo_componenti_extra),
            "costo_packing": _round_money(costo_packing),
            "costo_spedizione": _round_money(costo_spedizione),
            "costo_costi_fissi": _round_money(costo_costi_fissi),
            "costo_manutenzione_ordinaria": _round_money(costo_manutenzione_ordinaria),
            "costo_manutenzione_straordinaria": _round_money(costo_manutenzione_straordinaria),
            "costo_ammortamento": _round_money(costo_ammortamento),
            "costo_straordinari_struttura": _round_money(costo_straordinari_struttura),
            "costo_progettazione": _round_money(costo_progettazione),
            "costo_rischio": _round_money(costo_rischio),
            "costo_extra_manual": _round_money(costo_extra_manual),
            "costo_pieno": _round_money(costo_pieno),
            "prezzo_finale": _round_money(prezzo_finale),
            "utile_lordo": _round_money(utile_lordo),
            "margine_lordo_perc": _round_money(margine_lordo_perc),
            "energy_multiplier_eff": _round_money(energy_multiplier_eff),
            "rischio_totale_perc": _round_money(rischio_totale_perc),
            "quota_costi_fissi_oraria": _round_money(quota_costi_fissi_oraria),
            "quota_manutenzione_ordinaria_oraria": _round_money(quota_manutenzione_ordinaria_oraria),
            "quota_manutenzione_straordinaria_oraria": _round_money(quota_manutenzione_straordinaria_oraria),
            "quota_straordinari_struttura_oraria": _round_money(quota_straordinari_struttura_oraria),
            "quota_ammortamento_oraria": _round_money(ammortamento_quota_oraria if ammortamento_attivo else 0.0),
            "warning": " ".join(warnings) if warnings else None,
        },
    }
