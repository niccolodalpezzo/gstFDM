from fastapi import APIRouter
from typing import List, Optional

from backend.schemas import DashboardAnalytics, DashboardSummary, ProjectCostItem, ProgettoCardData
from backend.services import dashboard_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    return dashboard_service.get_summary()


@router.get("/projects", response_model=List[ProgettoCardData])
def get_projects_with_margins():
    return dashboard_service.get_projects_with_margins()


@router.get("/analytics", response_model=DashboardAnalytics)
def get_analytics(
    mode: Optional[str] = "mese",
    mese: Optional[int] = None,
    anno: Optional[int] = None,
    dal: Optional[str] = None,
    al: Optional[str] = None,
):
    return dashboard_service.get_analytics(mode=mode or "mese", mese=mese, anno=anno, dal=dal, al=al)


@router.get("/project-costs", response_model=List[ProjectCostItem])
def get_project_costs():
    return dashboard_service.get_project_cost_analysis()
