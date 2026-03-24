"""
Entry point del backend FastAPI.
Eseguire dalla root del progetto (calcolo-costi/):

    python run.py

oppure direttamente con uvicorn:

    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
