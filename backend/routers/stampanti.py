from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import StampanteCreate, StampanteOut
import database as db

router = APIRouter()


@router.get("", response_model=List[StampanteOut])
def list_stampanti():
    return db.get_stampanti().to_dict("records")


@router.post("", response_model=StampanteOut, status_code=201)
def create_stampante(body: StampanteCreate):
    new_id = db.add_stampante(
        body.marca, body.modello, body.diametro_ugello,
        body.consumo_w, body.costo_acquisto, body.ammortamento_orario,
        body.asset_name, body.status, body.build_volume_x,
        body.build_volume_y, body.build_volume_z,
        body.initial_runtime_hours, body.active_nozzle_id,
    )
    # Auto-crea il nozzle come pezzo di ricambio se non già assegnato
    active_nozzle_id = body.active_nozzle_id
    if active_nozzle_id is None and (body.diametro_ugello or 0) > 0:
        diam = body.diametro_ugello
        nozzle_name = f"Nozzle {diam}mm — {body.marca} {body.modello}".strip(" —")
        uid = db.add_component_replacement(
            name=nozzle_name,
            material="",
            stampante_ids=[new_id],
            compatibility_label=f"{body.marca} {body.modello}".strip(),
            dimensions=f"Ø{diam}mm",
            installed_date=None,
            notes="Creato automaticamente dalla registrazione stampante",
            tipo_pezzo="Nozzle",
        )
        components = db.get_component_replacements()
        nozzle = next((c for c in components if c["asset_uid"] == uid), None)
        if nozzle:
            active_nozzle_id = nozzle["id"]
            db.update_stampante(
                new_id, body.marca, body.modello, body.diametro_ugello,
                body.consumo_w, body.costo_acquisto, body.ammortamento_orario,
                body.asset_name, body.status, body.build_volume_x,
                body.build_volume_y, body.build_volume_z,
                body.initial_runtime_hours, active_nozzle_id,
            )
    df = db.get_stampanti()
    return df[df["id"] == new_id].iloc[0].to_dict()


@router.put("/{stampante_id}", response_model=StampanteOut)
def update_stampante(stampante_id: int, body: StampanteCreate):
    df = db.get_stampanti()
    if df[df["id"] == stampante_id].empty:
        raise HTTPException(status_code=404, detail="Printer not found")
    db.update_stampante(
        stampante_id, body.marca, body.modello, body.diametro_ugello,
        body.consumo_w, body.costo_acquisto, body.ammortamento_orario,
        body.asset_name, body.status, body.build_volume_x,
        body.build_volume_y, body.build_volume_z,
        body.initial_runtime_hours, body.active_nozzle_id,
    )
    df = db.get_stampanti()
    return df[df["id"] == stampante_id].iloc[0].to_dict()


@router.delete("/{stampante_id}", status_code=204)
def delete_stampante(stampante_id: int):
    db.delete_stampante(stampante_id)
