from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import settings, stampanti, progetti, magazzino, costi_fissi, log_stampe, dashboard, spese_una_tantum, component_replacements, generic_assets, tare_overrides, clienti, fornitori, material_density_ratios, pianificazione, manutenzioni
import utils

app = FastAPI(title="PrintFarm API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173", "http://127.0.0.1:4173",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176",
        "http://localhost:5177", "http://127.0.0.1:5177",
        "http://localhost:5178", "http://127.0.0.1:5178",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    utils.setup_environment()


# Monta tutti i router
app.include_router(dashboard.router,         prefix="/api/dashboard",         tags=["dashboard"])
app.include_router(progetti.router,          prefix="/api/progetti",          tags=["progetti"])
app.include_router(stampanti.router,         prefix="/api/stampanti",         tags=["stampanti"])
app.include_router(magazzino.router,         prefix="/api/magazzino",         tags=["magazzino"])
app.include_router(log_stampe.router,        prefix="/api/log-stampe",        tags=["log_stampe"])
app.include_router(costi_fissi.router,       prefix="/api/costi-fissi",       tags=["costi_fissi"])
app.include_router(spese_una_tantum.router,       prefix="/api/spese-una-tantum",       tags=["spese_una_tantum"])
app.include_router(component_replacements.router, prefix="/api/component-replacements", tags=["component_replacements"])
app.include_router(generic_assets.router,         prefix="/api/generic-assets",         tags=["generic_assets"])
app.include_router(tare_overrides.router,         prefix="/api/tare-overrides",         tags=["tare_overrides"])
app.include_router(settings.router,               prefix="/api/settings",               tags=["settings"])
app.include_router(clienti.router,                prefix="/api/clienti",                tags=["clienti"])
app.include_router(fornitori.router,              prefix="/api/fornitori",              tags=["fornitori"])
app.include_router(material_density_ratios.router, prefix="/api/material-density-ratios", tags=["material_density_ratios"])
app.include_router(pianificazione.router,          prefix="/api/pianificazione",          tags=["pianificazione"])
app.include_router(manutenzioni.router,            prefix="/api/manutenzioni",            tags=["manutenzioni"])


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
