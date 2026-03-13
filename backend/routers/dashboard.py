from fastapi import APIRouter
from typing import List
from backend.schemas import DashboardSummary, ProgettoCardData, ProgettoOut, MarginiCalcolati
import database as db
import calculations

router = APIRouter()


def _to_list(df):
    return df.to_dict("records")


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    progetti = _to_list(db.get_progetti())
    logs = _to_list(db.get_log_stampe())
    stampanti = _to_list(db.get_stampanti())
    magazzino = _to_list(db.get_magazzino())
    costi_fissi = _to_list(db.get_costi_fissi())

    result = calculations.calcola_riepilogo_finanziario(
        progetti, logs, stampanti, magazzino, costi_fissi
    )
    return result


@router.get("/projects", response_model=List[ProgettoCardData])
def get_projects_with_margins():
    progetti = _to_list(db.get_progetti())
    tutti_i_logs = _to_list(db.get_log_stampe())
    stampanti = _to_list(db.get_stampanti())
    magazzino = _to_list(db.get_magazzino())
    costi_fissi = _to_list(db.get_costi_fissi())

    result = []
    for p in progetti:
        logs = [l for l in tutti_i_logs if l["progetto_id"] == p["id"]]
        calcoli = calculations.calcola_margine_completo(
            p, logs, stampanti, magazzino, costi_fissi
        )
        result.append(ProgettoCardData(
            progetto=ProgettoOut(**p),
            calcoli=MarginiCalcolati(**calcoli)
        ))
    return result
