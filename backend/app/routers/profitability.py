from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.schemas.reports import ProfitRow
from app.services.profitability import compute_profitability

router = APIRouter(prefix="/profitability", tags=["profitability"])

VALID_DIMENSIONS = {"vehicle", "job-group", "customer", "driver"}


@router.get("/", response_model=list[ProfitRow])
def profitability(
    from_date: Annotated[str, Query(alias="from")],
    to_date: Annotated[str, Query(alias="to")],
    dimension: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("profit-center", "read")),
):
    if dimension not in VALID_DIMENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"dimension must be one of: {', '.join(sorted(VALID_DIMENSIONS))}",
        )
    return compute_profitability(db, user.company_id, from_date, to_date, dimension)
