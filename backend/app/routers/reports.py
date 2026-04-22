from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.schemas.reports import PLReport, VehicleRow, JobGroupRow
from app.services.report import (
    build_pl_report,
    build_vehicle_report,
    build_vehicle_ytd_report,
    build_job_group_report,
    build_job_group_ytd_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/pl", response_model=PLReport)
def pl_report(
    year: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    return build_pl_report(db, user.company_id, year)


@router.get("/vehicle", response_model=list[VehicleRow])
def vehicle_report(
    year: int,
    month: Optional[int] = None,
    ytd: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    if month is not None and ytd is not None:
        raise HTTPException(status_code=422, detail="Provide either month or ytd=true, not both")
    if month is None and ytd is None:
        raise HTTPException(status_code=422, detail="Provide either month (1-12) or ytd=true")
    if ytd:
        today = date.today()
        month_count = today.month if year == today.year else 12
        return build_vehicle_ytd_report(db, user.company_id, year, month_count)
    return build_vehicle_report(db, user.company_id, year, month)


@router.get("/job-group", response_model=list[JobGroupRow])
def job_group_report(
    year: int,
    month: Optional[int] = None,
    ytd: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    if month is not None and ytd is not None:
        raise HTTPException(status_code=422, detail="Provide either month or ytd=true, not both")
    if month is None and ytd is None:
        raise HTTPException(status_code=422, detail="Provide either month (1-12) or ytd=true")
    if ytd:
        today = date.today()
        month_count = today.month if year == today.year else 12
        return build_job_group_ytd_report(db, user.company_id, year, month_count)
    return build_job_group_report(db, user.company_id, year, month)
