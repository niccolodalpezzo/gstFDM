# _legacy/

Questa directory contiene il codice precedente basato su **Streamlit**, ora sostituito dall'architettura **FastAPI + React**.

## File archiviati

| File | Motivo |
|------|--------|
| `streamlit_app.py` | UI originale Streamlit (663 righe). Sostituita dal frontend React in `frontend/`. Importava anche `gcode_parser` che non è mai stato creato. |

## Nota

Questi file **non sono parte del prodotto attivo**. Non avviarli. Non importarli.
Il prodotto attivo si avvia con `run.py` alla root (vedi `README.md`).
