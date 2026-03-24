# PrintFarm Cost Calculator

Applicazione per il calcolo dei costi di stampa 3D.
Stack: **FastAPI** (backend) + **React + Vite** (frontend) + **SQLite** (database).

---

## Avvio in sviluppo

### Prerequisiti

- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
# dalla directory calcolo-costi/
cd calcolo-costi

pip install -r backend/requirements.txt

python run.py
# oppure: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend disponibile su: http://localhost:8000
Documentazione API: http://localhost:8000/docs

### 2. Frontend

```bash
cd calcolo-costi/frontend

npm install
npm run dev
```

Frontend disponibile su: http://localhost:5173

---

## Struttura del progetto

```
calcolo-costi/
├── run.py                  # Entry point backend
├── database.py             # Layer SQLite + CRUD
├── calculations.py         # Logica calcolo margini
├── utils.py                # Setup ambiente, settings JSON
├── reports.py              # Generazione report TXT
│
├── backend/
│   ├── main.py             # App FastAPI + router mount
│   ├── schemas.py          # Modelli Pydantic request/response
│   └── routers/            # Un file per dominio (progetti, magazzino, ecc.)
│
├── frontend/               # React + Vite + Tailwind + Radix UI
│
├── configs/
│   └── settings.json       # Configurazione utente (generato al primo avvio)
├── data/
│   └── printfarm.sqlite    # Database (generato al primo avvio)
├── exports/                # Report TXT generati
│
└── _legacy/
    └── streamlit_app.py    # Vecchia UI Streamlit — NON utilizzare
```

---

## Configurazione

Al primo avvio il backend crea automaticamente:
- `configs/settings.json` con i valori di default
- `data/printfarm.sqlite` con lo schema completo

I settings modificabili dall'app (costo kWh, tariffa oraria, ore mensili farm) vengono salvati in `configs/settings.json`.

---

## Build per produzione

```bash
# frontend
cd frontend
npm run build
# output in frontend/dist/

# backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
