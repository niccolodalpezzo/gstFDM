import sys
import os

# Aggiunge il root del progetto al path per importare database, calculations, ecc.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import settings, stampanti, progetti, magazzino, costi_fissi, log_stampe, gcode, dashboard
import utils

app = FastAPI(title="PrintFarm API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    utils.setup_environment()


# Monta tutti i router
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["dashboard"])
app.include_router(progetti.router,     prefix="/api/progetti",     tags=["progetti"])
app.include_router(stampanti.router,    prefix="/api/stampanti",    tags=["stampanti"])
app.include_router(magazzino.router,    prefix="/api/magazzino",    tags=["magazzino"])
app.include_router(log_stampe.router,   prefix="/api/log-stampe",   tags=["log_stampe"])
app.include_router(costi_fissi.router,  prefix="/api/costi-fissi",  tags=["costi_fissi"])
app.include_router(gcode.router,        prefix="/api/gcode",        tags=["gcode"])
app.include_router(settings.router,     prefix="/api/settings",     tags=["settings"])


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
