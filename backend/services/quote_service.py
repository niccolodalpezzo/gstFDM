from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import database as db
from backend.repositories import finance, printers as printer_repo
from backend.services import maintenance_service, quote_cost_engine, settings_service


IMMUTABLE_QUOTE_STATES = {"confermato", "convertito"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row) -> dict[str, Any]:
    return dict(row) if row is not None else {}


def _boolify(record: dict[str, Any], keys: list[str]) -> dict[str, Any]:
    for key in keys:
        if key in record and record[key] is not None:
            record[key] = bool(record[key])
    return record


def _printer_label(printer: dict) -> str:
    label = (printer.get("asset_name") or "").strip()
    if label:
        return label
    return f"{printer.get('marca', '')} {printer.get('modello', '')}".strip()


def _client_snapshot_name(conn, cliente_id: int | None, fallback: str = "") -> str:
    if cliente_id is None:
        return fallback or ""
    row = conn.execute(
        "SELECT nome, cognome, azienda FROM clienti WHERE id = ?",
        (cliente_id,),
    ).fetchone()
    if not row:
        return fallback or ""
    azienda = (row["azienda"] or "").strip()
    if azienda:
        return azienda
    return f"{row['nome'] or ''} {row['cognome'] or ''}".strip()


def _get_material_config(conn, materiale: str, marca: str) -> dict[str, Any] | None:
    normalized_materiale = (materiale or "").strip()
    normalized_marca = (marca or "").strip()
    if not normalized_materiale:
        return None

    exact = conn.execute(
        """SELECT * FROM material_configs
           WHERE materiale = ? AND marca = ?
           ORDER BY id DESC LIMIT 1""",
        (normalized_materiale, normalized_marca),
    ).fetchone()
    if exact:
        return dict(exact)

    generic = conn.execute(
        """SELECT * FROM material_configs
           WHERE materiale = ? AND marca = ''
           ORDER BY id DESC LIMIT 1""",
        (normalized_materiale,),
    ).fetchone()
    return dict(generic) if generic else None


def _resolve_material_rows(conn, quote: dict[str, Any]) -> list[dict[str, Any]]:
    resolved: list[dict[str, Any]] = []
    for row in quote.get("materiali", []):
        magazzino_id = row.get("magazzino_id")

        # Salta righe vuote/template (nessun materiale e 0 grammi)
        materiale_raw = row.get("materiale_nome") or ""
        if not materiale_raw.strip() and magazzino_id is None and float(row.get("grammi_modello") or 0) == 0:
            continue

        stock_row = None
        if magazzino_id is not None:
            stock_row = conn.execute(
                "SELECT * FROM magazzino WHERE id = ?",
                (magazzino_id,),
            ).fetchone()
            if stock_row is None:
                raise ValueError(f"Materiale di magazzino non trovato: ID {magazzino_id}")

        materiale_nome = row.get("materiale_nome") or (stock_row["materiale"] if stock_row else "")
        marca = row.get("marca") or (stock_row["marca"] if stock_row else "")
        colore = row.get("colore") or (stock_row["colore"] if stock_row else "")

        # Carica config materiale (serve sia per costo_kg che per scarto/energy/risk)
        config = _get_material_config(conn, materiale_nome, marca) or {}

        # Risoluzione costo_kg: riga manuale → magazzino → config materiale → errore
        costo_kg = row.get("costo_kg")
        if costo_kg is None and stock_row is not None:
            costo_kg = stock_row["costo_kg"]
        if costo_kg is None:
            cfg_costo = config.get("costo_kg")
            if cfg_costo is not None and float(cfg_costo) > 0:
                costo_kg = float(cfg_costo)
        if costo_kg is None or float(costo_kg) <= 0:
            mat_label = f"{materiale_nome or '?'} / {marca or 'generale'}"
            raise ValueError(
                f"Manca il costo €/kg nella configurazione materiale {mat_label}. "
                "Vai in Impostazioni e completa il campo."
            )

        scarto_perc = row.get("scarto_perc")
        if scarto_perc is None:
            scarto_perc = config.get("scarto_predefinito_perc", 0.0)
        energy_multiplier = row.get("energy_multiplier")
        if energy_multiplier is None:
            energy_multiplier = config.get("energy_multiplier", 1.0)
        risk_perc = row.get("risk_perc")
        if risk_perc is None:
            risk_perc = config.get("risk_perc_base", 0.0)

        resolved.append({
            "magazzino_id": magazzino_id,
            "materiale_nome_snapshot": materiale_nome,
            "marca_snapshot": marca,
            "colore_snapshot": colore,
            "costo_kg_snapshot": float(costo_kg),
            "grammi_modello": float(row.get("grammi_modello") or 0.0),
            "scarto_perc": float(scarto_perc or 0.0),
            "energy_multiplier_snapshot": float(energy_multiplier or 1.0),
            "risk_perc_snapshot": float(risk_perc or 0.0),
        })
    return resolved


def _resolve_post_rows(quote: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "descrizione": row.get("descrizione") or "",
            "minuti": row.get("minuti"),
            "costo_manual": row.get("costo_manual"),
        }
        for row in quote.get("post_produzione", [])
    ]


def _resolve_component_rows(quote: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "descrizione": row.get("descrizione") or "",
            "quantita": row.get("quantita", 1.0),
            "costo_unitario": row.get("costo_unitario", 0.0),
        }
        for row in quote.get("componenti_extra", [])
    ]


def _serialize_snapshot(
    *,
    quote: dict[str, Any],
    settings: dict[str, Any],
    printer: dict[str, Any],
    extraordinary_allocations: list[dict[str, Any]],
    structure_costs: list[dict[str, Any]],
    ordinary_templates: list[dict[str, Any]],
    preview: dict[str, Any],
    cliente_nome_snapshot: str,
) -> str:
    payload = {
        "testata": {
            "data": quote.get("data"),
            "cliente_id": quote.get("cliente_id"),
            "cliente_nome_snapshot": cliente_nome_snapshot,
            "progetto_nome": quote.get("progetto_nome"),
            "stampante_id": quote.get("stampante_id"),
            "stampante_nome_snapshot": _printer_label(printer),
            "stato": quote.get("stato"),
            "quantita": quote.get("quantita"),
            "ore_stampa": quote.get("ore_stampa"),
            "minuti_setup": quote.get("minuti_setup"),
            "margine_lordo_perc": quote.get("margine_lordo_perc"),
            "override_rischio_perc": quote.get("override_rischio_perc"),
        },
        "settings": {
            "costo_kwh": settings.get("costo_kwh"),
            "costo_orario_manodopera": settings.get("costo_orario_manodopera", settings.get("costo_orario_post_prod")),
            "ore_lavorative_mensili_farm": settings.get("ore_lavorative_mensili_farm"),
            "margine_lordo_default_perc": settings.get("margine_lordo_default_perc"),
            "costo_orario_progettazione_default": settings.get("costo_orario_progettazione_default"),
            "criterio_rischio_default": settings.get("criterio_rischio_default"),
        },
        "stampante": {
            "id": printer.get("id"),
            "nome": _printer_label(printer),
            "consumo_w": printer.get("consumo_w"),
            "ammortamento_attivo": printer.get("ammortamento_attivo"),
            "ammortamento_residuo_euro": printer.get("ammortamento_residuo_euro"),
            "ammortamento_recuperato_euro": printer.get("ammortamento_recuperato_euro"),
            "ammortamento_quota_oraria": printer.get("ammortamento_quota_oraria", printer.get("ammortamento_orario")),
            "risk_perc_base": printer.get("risk_perc_base", 0.0),
        },
        "materiali": preview["materiali"],
        "post_produzione": preview["post_produzione"],
        "componenti_extra": preview["componenti_extra"],
        "manutenzioni_ordinarie": [
            {
                "id": item.get("id"),
                "nome": item.get("nome"),
                "soglia_ore_massima": item.get("soglia_ore_massima"),
                "costo_standard_intervento": item.get("costo_standard_intervento"),
            }
            for item in ordinary_templates
            if item.get("attiva", True)
        ],
        "manutenzioni_straordinarie_attive": extraordinary_allocations,
        "costi_straordinari_struttura_attivi": structure_costs,
        "breakdown": preview["breakdown"],
        "data_snapshot": _now_iso(),
    }
    return json.dumps(payload, ensure_ascii=True)


def _calculate_preview(conn, quote: dict[str, Any]) -> dict[str, Any]:
    printer = printer_repo.get_printer(int(quote["stampante_id"]))
    if printer is None:
        raise ValueError("Stampante selezionata non trovata.")

    settings = settings_service.get_settings()
    fixed_costs = finance.list_fixed_costs()
    ordinary_templates = maintenance_service.list_templates(only_active=True)

    extraordinary_allocations_raw = conn.execute(
        """SELECT *
           FROM extraordinary_maintenance
           WHERE printer_id = ? AND spalmatura_attiva = 1
           ORDER BY created_at ASC""",
        (quote["stampante_id"],),
    ).fetchall()
    extraordinary_allocations = [_boolify(dict(row), ["spalmatura_attiva"]) for row in extraordinary_allocations_raw]

    structure_costs_raw = conn.execute(
        """SELECT *
           FROM costi_straordinari_struttura
           WHERE attivo = 1
           ORDER BY created_at ASC""",
    ).fetchall()
    structure_costs = [_boolify(dict(row), ["attivo"]) for row in structure_costs_raw]

    material_rows = _resolve_material_rows(conn, quote)
    post_rows = _resolve_post_rows(quote)
    component_rows = _resolve_component_rows(quote)

    preview = quote_cost_engine.calculate_quote_breakdown(
        quote=quote,
        material_rows=material_rows,
        post_rows=post_rows,
        component_rows=component_rows,
        settings=settings,
        printer=printer,
        fixed_costs=fixed_costs,
        ordinary_templates=ordinary_templates,
        extraordinary_allocations=extraordinary_allocations,
        structure_costs=structure_costs,
    )

    cliente_nome_snapshot = _client_snapshot_name(
        conn,
        quote.get("cliente_id"),
        quote.get("cliente_nome_snapshot") or "",
    )

    preview["snapshot_json"] = _serialize_snapshot(
        quote=quote,
        settings=settings,
        printer=printer,
        extraordinary_allocations=extraordinary_allocations,
        structure_costs=structure_costs,
        ordinary_templates=ordinary_templates,
        preview=preview,
        cliente_nome_snapshot=cliente_nome_snapshot,
    )
    preview["cliente_nome_snapshot"] = cliente_nome_snapshot
    preview["stampante_nome_snapshot"] = _printer_label(printer)
    return preview


def _generate_numero_preventivo(conn, data_preventivo: str) -> str:
    anno = (data_preventivo or _now_iso()[:10])[:4] or datetime.now().strftime("%Y")
    prefix = f"PREV-{anno}-"
    row = conn.execute(
        "SELECT COUNT(*) AS total FROM preventivi WHERE numero_preventivo LIKE ?",
        (f"{prefix}%",),
    ).fetchone()
    next_number = int((row["total"] if row else 0) or 0) + 1
    return f"{prefix}{next_number:04d}"


def _replace_child_rows(conn, preventivo_id: int, preview: dict[str, Any]) -> None:
    conn.execute("DELETE FROM preventivo_materiali WHERE preventivo_id = ?", (preventivo_id,))
    conn.execute("DELETE FROM preventivo_post_produzione WHERE preventivo_id = ?", (preventivo_id,))
    conn.execute("DELETE FROM preventivo_componenti_extra WHERE preventivo_id = ?", (preventivo_id,))

    for row in preview["materiali"]:
        conn.execute(
            """INSERT INTO preventivo_materiali
               (preventivo_id, magazzino_id, materiale_nome_snapshot, marca_snapshot, colore_snapshot,
                costo_kg_snapshot, grammi_modello, scarto_perc, grammi_totali,
                energy_multiplier_snapshot, risk_perc_snapshot, costo_totale)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                preventivo_id,
                row.get("magazzino_id"),
                row.get("materiale_nome_snapshot"),
                row.get("marca_snapshot"),
                row.get("colore_snapshot"),
                row.get("costo_kg_snapshot"),
                row.get("grammi_modello"),
                row.get("scarto_perc"),
                row.get("grammi_totali"),
                row.get("energy_multiplier_snapshot"),
                row.get("risk_perc_snapshot"),
                row.get("costo_totale"),
            ),
        )

    for row in preview["post_produzione"]:
        conn.execute(
            """INSERT INTO preventivo_post_produzione
               (preventivo_id, descrizione, minuti, costo_manual, costo_totale)
               VALUES (?,?,?,?,?)""",
            (
                preventivo_id,
                row.get("descrizione"),
                row.get("minuti"),
                row.get("costo_manual"),
                row.get("costo_totale"),
            ),
        )

    for row in preview["componenti_extra"]:
        conn.execute(
            """INSERT INTO preventivo_componenti_extra
               (preventivo_id, descrizione, quantita, costo_unitario, costo_totale)
               VALUES (?,?,?,?,?)""",
            (
                preventivo_id,
                row.get("descrizione"),
                row.get("quantita"),
                row.get("costo_unitario"),
                row.get("costo_totale"),
            ),
        )


def _fetch_quote_base(conn, preventivo_id: int):
    return conn.execute(
        "SELECT * FROM preventivi WHERE id = ?",
        (preventivo_id,),
    ).fetchone()


def _fetch_quote_payload(conn, preventivo_id: int) -> dict[str, Any] | None:
    base_row = _fetch_quote_base(conn, preventivo_id)
    if base_row is None:
        return None

    materials = conn.execute(
        "SELECT * FROM preventivo_materiali WHERE preventivo_id = ? ORDER BY id ASC",
        (preventivo_id,),
    ).fetchall()
    post_rows = conn.execute(
        "SELECT * FROM preventivo_post_produzione WHERE preventivo_id = ? ORDER BY id ASC",
        (preventivo_id,),
    ).fetchall()
    component_rows = conn.execute(
        "SELECT * FROM preventivo_componenti_extra WHERE preventivo_id = ? ORDER BY id ASC",
        (preventivo_id,),
    ).fetchall()

    base = dict(base_row)
    base["materiali"] = [
        {
            "magazzino_id": row["magazzino_id"],
            "materiale_nome": row["materiale_nome_snapshot"],
            "marca": row["marca_snapshot"],
            "colore": row["colore_snapshot"],
            "costo_kg": row["costo_kg_snapshot"],
            "grammi_modello": row["grammi_modello"],
            "scarto_perc": row["scarto_perc"],
            "energy_multiplier": row["energy_multiplier_snapshot"],
            "risk_perc": row["risk_perc_snapshot"],
        }
        for row in materials
    ]
    base["post_produzione"] = [
        {
            "descrizione": row["descrizione"],
            "minuti": row["minuti"],
            "costo_manual": row["costo_manual"],
        }
        for row in post_rows
    ]
    base["componenti_extra"] = [
        {
            "descrizione": row["descrizione"],
            "quantita": row["quantita"],
            "costo_unitario": row["costo_unitario"],
        }
        for row in component_rows
    ]
    return base


def _format_quote_response(conn, preventivo_id: int) -> dict[str, Any]:
    base_row = _fetch_quote_base(conn, preventivo_id)
    if base_row is None:
        raise LookupError("Preventivo non trovato.")

    materials = [
        dict(row)
        for row in conn.execute(
            "SELECT * FROM preventivo_materiali WHERE preventivo_id = ? ORDER BY id ASC",
            (preventivo_id,),
        ).fetchall()
    ]
    post_rows = [
        dict(row)
        for row in conn.execute(
            "SELECT * FROM preventivo_post_produzione WHERE preventivo_id = ? ORDER BY id ASC",
            (preventivo_id,),
        ).fetchall()
    ]
    component_rows = [
        dict(row)
        for row in conn.execute(
            "SELECT * FROM preventivo_componenti_extra WHERE preventivo_id = ? ORDER BY id ASC",
            (preventivo_id,),
        ).fetchall()
    ]

    base = dict(base_row)
    breakdown = {}
    if base.get("snapshot_json"):
        try:
            snapshot = json.loads(base["snapshot_json"])
            breakdown = snapshot.get("breakdown") or {}
        except json.JSONDecodeError:
            breakdown = {}

    return {
        **base,
        "materiali": materials,
        "post_produzione": post_rows,
        "componenti_extra": component_rows,
        "breakdown": breakdown,
    }


def list_quotes() -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        rows = conn.execute(
            """SELECT id, numero_preventivo, data, cliente_id, cliente_nome_snapshot, progetto_nome,
                      stampante_id, stampante_nome_snapshot, stato, quantita, costo_pieno,
                      prezzo_finale, utile_lordo, margine_lordo_perc, updated_at
               FROM preventivi
               ORDER BY data DESC, id DESC"""
        ).fetchall()
        return [dict(row) for row in rows]


def get_quote(preventivo_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        return _format_quote_response(conn, preventivo_id)


def preview_quote(data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        preview = _calculate_preview(conn, data)
        return {
            "breakdown": preview["breakdown"],
            "materiali": preview["materiali"],
            "post_produzione": preview["post_produzione"],
            "componenti_extra": preview["componenti_extra"],
        }


def create_quote(data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        numero_preventivo = data.get("numero_preventivo") or _generate_numero_preventivo(conn, data.get("data"))
        now = _now_iso()
        preview = _calculate_preview(conn, {**data, "numero_preventivo": numero_preventivo})
        breakdown = preview["breakdown"]
        cliente_nome_snapshot = preview["cliente_nome_snapshot"]
        stampante_nome_snapshot = preview["stampante_nome_snapshot"]

        cur = conn.execute(
            """INSERT INTO preventivi
               (numero_preventivo, data, cliente_id, cliente_nome_snapshot, progetto_nome,
                stampante_id, stampante_nome_snapshot, stato, quantita, ore_stampa, minuti_setup,
                costo_progettazione, costo_packing, costo_spedizione, costo_extra_manual,
                margine_lordo_perc, override_rischio_perc, note, snapshot_json,
                costo_pieno, prezzo_finale, utile_lordo, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                numero_preventivo,
                data["data"],
                data.get("cliente_id"),
                cliente_nome_snapshot,
                data["progetto_nome"],
                data["stampante_id"],
                stampante_nome_snapshot,
                data.get("stato", "bozza"),
                data.get("quantita", 1),
                data.get("ore_stampa", 0.0),
                data.get("minuti_setup", 0.0),
                data.get("costo_progettazione", 0.0),
                data.get("costo_packing", 0.0),
                data.get("costo_spedizione", 0.0),
                data.get("costo_extra_manual", 0.0),
                data.get("margine_lordo_perc", 0.0),
                data.get("override_rischio_perc"),
                data.get("note", ""),
                preview["snapshot_json"],
                breakdown["costo_pieno"],
                breakdown["prezzo_finale"],
                breakdown["utile_lordo"],
                now,
                now,
            ),
        )
        preventivo_id = cur.lastrowid
        _replace_child_rows(conn, preventivo_id, preview)
        conn.commit()
        return _format_quote_response(conn, preventivo_id)


def update_quote(preventivo_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        current = _fetch_quote_base(conn, preventivo_id)
        if current is None:
            raise LookupError("Preventivo non trovato.")
        if current["stato"] in IMMUTABLE_QUOTE_STATES:
            raise ValueError("Il preventivo non e modificabile dopo conferma o conversione.")

        merged = {
            **dict(current),
            **data,
        }
        preview = _calculate_preview(conn, merged)
        breakdown = preview["breakdown"]
        now = _now_iso()

        conn.execute(
            """UPDATE preventivi SET
               data = ?, cliente_id = ?, cliente_nome_snapshot = ?, progetto_nome = ?,
               stampante_id = ?, stampante_nome_snapshot = ?, stato = ?, quantita = ?,
               ore_stampa = ?, minuti_setup = ?, costo_progettazione = ?, costo_packing = ?,
               costo_spedizione = ?, costo_extra_manual = ?, margine_lordo_perc = ?,
               override_rischio_perc = ?, note = ?, snapshot_json = ?, costo_pieno = ?,
               prezzo_finale = ?, utile_lordo = ?, updated_at = ?
               WHERE id = ?""",
            (
                merged["data"],
                merged.get("cliente_id"),
                preview["cliente_nome_snapshot"],
                merged["progetto_nome"],
                merged["stampante_id"],
                preview["stampante_nome_snapshot"],
                merged.get("stato", "bozza"),
                merged.get("quantita", 1),
                merged.get("ore_stampa", 0.0),
                merged.get("minuti_setup", 0.0),
                merged.get("costo_progettazione", 0.0),
                merged.get("costo_packing", 0.0),
                merged.get("costo_spedizione", 0.0),
                merged.get("costo_extra_manual", 0.0),
                merged.get("margine_lordo_perc", 0.0),
                merged.get("override_rischio_perc"),
                merged.get("note", ""),
                preview["snapshot_json"],
                breakdown["costo_pieno"],
                breakdown["prezzo_finale"],
                breakdown["utile_lordo"],
                now,
                preventivo_id,
            ),
        )
        _replace_child_rows(conn, preventivo_id, preview)
        conn.commit()
        return _format_quote_response(conn, preventivo_id)


def recalculate_quote(preventivo_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        payload = _fetch_quote_payload(conn, preventivo_id)
        if payload is None:
            raise LookupError("Preventivo non trovato.")

        if payload["stato"] in IMMUTABLE_QUOTE_STATES:
            return _format_quote_response(conn, preventivo_id)

        preview = _calculate_preview(conn, payload)
        breakdown = preview["breakdown"]
        now = _now_iso()
        conn.execute(
            """UPDATE preventivi SET
               cliente_nome_snapshot = ?,
               stampante_nome_snapshot = ?,
               snapshot_json = ?,
               costo_pieno = ?,
               prezzo_finale = ?,
               utile_lordo = ?,
               updated_at = ?
               WHERE id = ?""",
            (
                preview["cliente_nome_snapshot"],
                preview["stampante_nome_snapshot"],
                preview["snapshot_json"],
                breakdown["costo_pieno"],
                breakdown["prezzo_finale"],
                breakdown["utile_lordo"],
                now,
                preventivo_id,
            ),
        )
        _replace_child_rows(conn, preventivo_id, preview)
        conn.commit()
        return _format_quote_response(conn, preventivo_id)


def _consume_structure_costs(conn, ore_stampa: float) -> None:
    if ore_stampa <= 0:
        return
    rows = conn.execute(
        """SELECT * FROM costi_straordinari_struttura
           WHERE attivo = 1
           ORDER BY created_at ASC, id ASC"""
    ).fetchall()

    for row in rows:
        quota = float(row["quota_oraria"] or 0.0)
        importo_residuo = float(row["importo_residuo"] or 0.0)
        ore_residue_raw = row["ore_da_spalmare_residue"]
        ore_residue = None if ore_residue_raw is None else float(ore_residue_raw or 0.0)

        ore_effettive = ore_stampa if ore_residue is None else min(ore_stampa, max(0.0, ore_residue))
        importo_consumato = min(quota * ore_effettive, max(0.0, importo_residuo))
        nuovo_importo_residuo = max(0.0, importo_residuo - importo_consumato)

        if ore_residue is None:
            nuove_ore_residue = None
        else:
            nuove_ore_residue = max(0.0, ore_residue - ore_effettive)

        attivo = 1
        if nuovo_importo_residuo <= 0:
            attivo = 0
        if nuove_ore_residue is not None and nuove_ore_residue <= 0:
            attivo = 0

        conn.execute(
            """UPDATE costi_straordinari_struttura
               SET importo_residuo = ?, ore_da_spalmare_residue = ?, attivo = ?, updated_at = ?
               WHERE id = ?""",
            (
                nuovo_importo_residuo,
                nuove_ore_residue,
                attivo,
                _now_iso(),
                row["id"],
            ),
        )


def _consume_ammortamento(conn, stampante_id: int, ore_stampa: float) -> None:
    if ore_stampa <= 0:
        return
    row = conn.execute(
        """SELECT ammortamento_attivo, ammortamento_residuo_euro, ammortamento_quota_oraria
           FROM stampanti WHERE id = ?""",
        (stampante_id,),
    ).fetchone()
    if row is None or not row["ammortamento_attivo"]:
        return

    quota = float(row["ammortamento_quota_oraria"] or 0.0)
    residuo = float(row["ammortamento_residuo_euro"] or 0.0)
    decrement_teorico = quota * ore_stampa
    decrement_effettivo = min(decrement_teorico, residuo)
    nuovo_residuo = max(0.0, residuo - decrement_effettivo)
    attivo = 1 if nuovo_residuo > 0 else 0
    conn.execute(
        """UPDATE stampanti SET
           ammortamento_residuo_euro = ?,
           ammortamento_recuperato_euro = COALESCE(ammortamento_recuperato_euro, 0) + ?,
           ammortamento_attivo = ?
           WHERE id = ?""",
        (nuovo_residuo, decrement_effettivo, attivo, stampante_id),
    )


def _consume_extraordinary_for_printer(conn, stampante_id: int, ore_stampa: float) -> None:
    if ore_stampa <= 0:
        return
    rows = conn.execute(
        """SELECT id, ore_residue_da_spalmare
           FROM extraordinary_maintenance
           WHERE printer_id = ? AND spalmatura_attiva = 1
           ORDER BY created_at ASC, id ASC""",
        (stampante_id,),
    ).fetchall()
    for row in rows:
        residue = float(row["ore_residue_da_spalmare"] or 0.0)
        nuove_ore = residue - ore_stampa
        if nuove_ore <= 0:
            conn.execute(
                """UPDATE extraordinary_maintenance
                   SET ore_residue_da_spalmare = 0, spalmatura_attiva = 0
                   WHERE id = ?""",
                (row["id"],),
            )
        else:
            conn.execute(
                """UPDATE extraordinary_maintenance
                   SET ore_residue_da_spalmare = ?
                   WHERE id = ?""",
                (nuove_ore, row["id"]),
            )


def confirm_quote(preventivo_id: int) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        payload = _fetch_quote_payload(conn, preventivo_id)
        if payload is None:
            raise LookupError("Preventivo non trovato.")
        if payload["stato"] == "confermato":
            return _format_quote_response(conn, preventivo_id)
        if payload["stato"] == "convertito":
            raise ValueError("Il preventivo e gia convertito.")

        preview = _calculate_preview(conn, payload)
        breakdown = preview["breakdown"]
        ore_stampa = float(payload.get("ore_stampa") or 0.0)

        _replace_child_rows(conn, preventivo_id, preview)
        conn.execute(
            """UPDATE preventivi SET
               stato = 'confermato',
               cliente_nome_snapshot = ?,
               stampante_nome_snapshot = ?,
               snapshot_json = ?,
               costo_pieno = ?,
               prezzo_finale = ?,
               utile_lordo = ?,
               updated_at = ?
               WHERE id = ?""",
            (
                preview["cliente_nome_snapshot"],
                preview["stampante_nome_snapshot"],
                preview["snapshot_json"],
                breakdown["costo_pieno"],
                breakdown["prezzo_finale"],
                breakdown["utile_lordo"],
                _now_iso(),
                preventivo_id,
            ),
        )

        if ore_stampa > 0:
            _consume_ammortamento(conn, int(payload["stampante_id"]), ore_stampa)
            _consume_extraordinary_for_printer(conn, int(payload["stampante_id"]), ore_stampa)
            _consume_structure_costs(conn, ore_stampa)

        conn.commit()
        return _format_quote_response(conn, preventivo_id)


def convert_quote(preventivo_id: int) -> dict[str, Any]:
    from backend.services import order_service

    with db.get_db_connection() as conn:
        payload = _fetch_quote_payload(conn, preventivo_id)
        if payload is None:
            raise LookupError("Preventivo non trovato.")

        if payload["stato"] == "convertito":
            result = _format_quote_response(conn, preventivo_id)
            result["ordine_id"] = payload.get("ordine_id")
            return result

        if payload["stato"] == "confermato":
            conn.execute(
                "UPDATE preventivi SET stato = 'convertito', updated_at = ? WHERE id = ?",
                (_now_iso(), preventivo_id),
            )
            conn.commit()
            ordine = order_service.create_order_from_quote(preventivo_id)
            result = _format_quote_response(conn, preventivo_id)
            result["ordine_id"] = ordine["id"]
            return result

    confirm_quote(preventivo_id)
    with db.get_db_connection() as conn:
        conn.execute(
            "UPDATE preventivi SET stato = 'convertito', updated_at = ? WHERE id = ?",
            (_now_iso(), preventivo_id),
        )
        conn.commit()
        ordine = order_service.create_order_from_quote(preventivo_id)
        result = _format_quote_response(conn, preventivo_id)
        result["ordine_id"] = ordine["id"]
        return result


def delete_quote(preventivo_id: int) -> None:
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM preventivo_materiali WHERE preventivo_id = ?", (preventivo_id,))
        conn.execute("DELETE FROM preventivo_post_produzione WHERE preventivo_id = ?", (preventivo_id,))
        conn.execute("DELETE FROM preventivo_componenti_extra WHERE preventivo_id = ?", (preventivo_id,))
        conn.execute("DELETE FROM preventivi WHERE id = ?", (preventivo_id,))
        conn.commit()


def list_material_configs() -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM material_configs ORDER BY materiale ASC, marca ASC, id ASC"
        ).fetchall()
        return [dict(row) for row in rows]


def upsert_material_config(data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        conn.execute(
            """INSERT INTO material_configs
               (materiale, marca, scarto_predefinito_perc, energy_multiplier, risk_perc_base, costo_kg, note, updated_at)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT(materiale, marca) DO UPDATE SET
                 scarto_predefinito_perc = excluded.scarto_predefinito_perc,
                 energy_multiplier = excluded.energy_multiplier,
                 risk_perc_base = excluded.risk_perc_base,
                 costo_kg = excluded.costo_kg,
                 note = excluded.note,
                 updated_at = excluded.updated_at""",
            (
                data["materiale"],
                data.get("marca", ""),
                data.get("scarto_predefinito_perc", 0.0),
                data.get("energy_multiplier", 1.0),
                data.get("risk_perc_base", 0.0),
                data.get("costo_kg"),
                data.get("note", ""),
                _now_iso(),
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM material_configs WHERE materiale = ? AND marca = ?",
            (data["materiale"], data.get("marca", "")),
        ).fetchone()
        return dict(row)


def delete_material_config(config_id: int) -> None:
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM material_configs WHERE id = ?", (config_id,))
        conn.commit()


def list_structure_costs() -> list[dict[str, Any]]:
    with db.get_db_connection() as conn:
        rows = conn.execute(
            """SELECT * FROM costi_straordinari_struttura
               ORDER BY attivo DESC, data DESC, id DESC"""
        ).fetchall()
        return [_boolify(dict(row), ["attivo"]) for row in rows]


def create_structure_cost(data: dict[str, Any]) -> dict[str, Any]:
    importo_totale = float(data.get("importo_totale") or 0.0)
    importo_residuo = data.get("importo_residuo")
    if importo_residuo is None:
        importo_residuo = importo_totale

    ore_totali = data.get("ore_da_spalmare_totali")
    ore_residue = data.get("ore_da_spalmare_residue")
    if ore_residue is None and ore_totali is not None:
        ore_residue = ore_totali

    with db.get_db_connection() as conn:
        cur = conn.execute(
            """INSERT INTO costi_straordinari_struttura
               (descrizione, importo_totale, importo_residuo, quota_oraria,
                ore_da_spalmare_totali, ore_da_spalmare_residue, attivo, data, note, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                data["descrizione"],
                importo_totale,
                float(importo_residuo or 0.0),
                float(data.get("quota_oraria") or 0.0),
                ore_totali,
                ore_residue,
                1 if data.get("attivo", True) else 0,
                data["data"],
                data.get("note", ""),
                _now_iso(),
                _now_iso(),
            ),
        )
        structure_id = cur.lastrowid
        conn.commit()
        row = conn.execute(
            "SELECT * FROM costi_straordinari_struttura WHERE id = ?",
            (structure_id,),
        ).fetchone()
        return _boolify(dict(row), ["attivo"])


def update_structure_cost(structure_id: int, data: dict[str, Any]) -> dict[str, Any]:
    with db.get_db_connection() as conn:
        current = conn.execute(
            "SELECT * FROM costi_straordinari_struttura WHERE id = ?",
            (structure_id,),
        ).fetchone()
        if current is None:
            raise LookupError("Costo straordinario struttura non trovato.")

        merged = {**dict(current), **data}
        conn.execute(
            """UPDATE costi_straordinari_struttura SET
               descrizione = ?, importo_totale = ?, importo_residuo = ?, quota_oraria = ?,
               ore_da_spalmare_totali = ?, ore_da_spalmare_residue = ?, attivo = ?, data = ?,
               note = ?, updated_at = ?
               WHERE id = ?""",
            (
                merged["descrizione"],
                merged["importo_totale"],
                merged["importo_residuo"],
                merged["quota_oraria"],
                merged.get("ore_da_spalmare_totali"),
                merged.get("ore_da_spalmare_residue"),
                1 if merged.get("attivo", True) else 0,
                merged["data"],
                merged.get("note", ""),
                _now_iso(),
                structure_id,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM costi_straordinari_struttura WHERE id = ?",
            (structure_id,),
        ).fetchone()
        return _boolify(dict(row), ["attivo"])


def delete_structure_cost(structure_id: int) -> None:
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM costi_straordinari_struttura WHERE id = ?", (structure_id,))
        conn.commit()


def list_quote_options() -> dict[str, Any]:
    with db.get_db_connection() as conn:
        materials = [dict(row) for row in conn.execute("SELECT * FROM magazzino ORDER BY materiale, marca, colore").fetchall()]
        clients = [dict(row) for row in conn.execute("SELECT * FROM clienti ORDER BY nome, cognome").fetchall()]
    printers = printer_repo.list_printers()
    return {
        "materials": materials,
        "printers": printers,
        "clients": clients,
    }
