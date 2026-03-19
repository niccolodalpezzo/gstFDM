from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.schemas import LogStampaCreate, LogStampaOut
import database as db

router = APIRouter()


@router.get("", response_model=List[LogStampaOut])
def list_log_stampe(progetto_id: Optional[int] = None):
    df = db.get_log_stampe(progetto_id=progetto_id)
    records = df.to_dict("records")
    # Normalizza NaN → None
    for r in records:
        for k, v in r.items():
            if v != v:  # NaN check
                r[k] = None
    return records


@router.post("", response_model=LogStampaOut, status_code=201)
def create_log_stampa(body: LogStampaCreate):
    # Risolvi codice bobina → magazzino_id
    bobina = db.get_bobina_by_codice(body.codice_bobina)
    if not bobina:
        raise HTTPException(
            status_code=404,
            detail=f"Bobina con codice '{body.codice_bobina}' non trovata o non attiva"
        )
    magazzino_id = bobina["id"]

    # Inserisci il log
    db.add_log_stampa(
        body.progetto_id, body.stampante_id, magazzino_id,
        body.grammi_usati, body.tempo_minuti,
        body.costo_post_prod, body.costo_extra, body.costo_packaging,
        body.data
    )

    # Aggiorna grammi della bobina
    db.update_magazzino_grammi(magazzino_id, body.grammi_usati)

    # Recupera e restituisce il log appena creato
    df = db.get_log_stampe(progetto_id=body.progetto_id)
    row = df.iloc[-1].to_dict()
    for k, v in row.items():
        if v != v:
            row[k] = None
    return row
