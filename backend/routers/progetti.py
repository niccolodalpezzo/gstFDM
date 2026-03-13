import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List
from backend.schemas import ProgettoCreate, ProgettoOut
import database as db
import calculations
import reports

router = APIRouter()


def _df_to_list(df):
    return df.to_dict("records")


@router.get("", response_model=List[ProgettoOut])
def list_progetti():
    return _df_to_list(db.get_progetti())


@router.post("", response_model=ProgettoOut, status_code=201)
def create_progetto(body: ProgettoCreate):
    db.add_progetto(
        body.nome, body.cliente, body.budget, body.stato,
        body.quantita_da_produrre, body.ore_progettazione, body.costo_extra_progetto
    )
    df = db.get_progetti()
    return df.iloc[-1].to_dict()


@router.put("/{progetto_id}", response_model=ProgettoOut)
def update_progetto(progetto_id: int, body: ProgettoCreate):
    df = db.get_progetti()
    if df[df["id"] == progetto_id].empty:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    db.update_progetto(
        progetto_id, body.nome, body.cliente, body.budget, body.stato,
        body.quantita_da_produrre, body.ore_progettazione, body.costo_extra_progetto
    )
    df = db.get_progetti()
    return df[df["id"] == progetto_id].iloc[0].to_dict()


@router.delete("/{progetto_id}", status_code=204)
def delete_progetto(progetto_id: int):
    db.delete_progetto(progetto_id)


@router.get("/{progetto_id}/report")
def get_report(progetto_id: int):
    progetti = _df_to_list(db.get_progetti())
    progetto = next((p for p in progetti if p["id"] == progetto_id), None)
    if not progetto:
        raise HTTPException(status_code=404, detail="Progetto non trovato")

    logs = _df_to_list(db.get_log_stampe(progetto_id=progetto_id))
    stampanti = _df_to_list(db.get_stampanti())
    magazzino = _df_to_list(db.get_magazzino())
    costi_fissi = _df_to_list(db.get_costi_fissi())

    calcoli = calculations.calcola_margine_completo(
        progetto, logs, stampanti, magazzino, costi_fissi
    )
    filepath = reports.generate_project_report(progetto, calcoli)

    return FileResponse(
        path=filepath,
        media_type="text/plain",
        filename=os.path.basename(filepath)
    )
