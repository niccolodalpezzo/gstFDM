from fastapi import APIRouter
from typing import List, Optional
import datetime
from backend.schemas import DashboardSummary, ProgettoCardData, ProgettoOut, MarginiCalcolati, DashboardAnalytics, ProjectCostItem
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


@router.get("/analytics", response_model=DashboardAnalytics)
def get_analytics(
    mode: Optional[str] = "mese",
    mese: Optional[int] = None,
    anno: Optional[int] = None,
    dal: Optional[str] = None,
    al: Optional[str] = None,
):
    today = datetime.date.today()

    if mode == "mese":
        m = mese or today.month
        a = anno or today.year
        dal_d = datetime.date(a, m, 1)
        # ultimo giorno del mese
        if m == 12:
            al_d = datetime.date(a, 12, 31)
        else:
            al_d = datetime.date(a, m + 1, 1) - datetime.timedelta(days=1)
    elif mode == "anno":
        a = anno or today.year
        dal_d = datetime.date(a, 1, 1)
        al_d  = datetime.date(a, 12, 31)
    else:  # periodo
        dal_d = datetime.date.fromisoformat(dal) if dal else datetime.date(today.year, 1, 1)
        al_d  = datetime.date.fromisoformat(al)  if al  else today

    return db.get_dashboard_analytics(dal_d.isoformat(), al_d.isoformat())


@router.get("/project-costs", response_model=List[ProjectCostItem])
def get_project_costs():
    return db.get_project_cost_analysis()
