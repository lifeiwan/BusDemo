from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.ga import GaEntry
from app.schemas.ga import GaEntryCreate, GaEntryRead, GaEntryUpdate

router = APIRouter(prefix="/ga-entries", tags=["ga"])


def _get_or_404(db, record_id, company_id):
    obj = db.query(GaEntry).filter(
        GaEntry.id == record_id, GaEntry.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="G&A entry not found")
    return obj


@router.get("/", response_model=list[GaEntryRead])
def list_ga_entries(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "read")),
):
    q = db.query(GaEntry).filter(GaEntry.company_id == user.company_id)
    if category is not None:
        q = q.filter(GaEntry.category == category)
    return q.all()


@router.post("/", response_model=GaEntryRead, status_code=201)
def create_ga_entry(
    body: GaEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = GaEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{entry_id}", response_model=GaEntryRead)
def get_ga_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "read")),
):
    return _get_or_404(db, entry_id, user.company_id)


@router.put("/{entry_id}", response_model=GaEntryRead)
def update_ga_entry(
    entry_id: int,
    body: GaEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = _get_or_404(db, entry_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{entry_id}", status_code=204)
def delete_ga_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = _get_or_404(db, entry_id, user.company_id)
    db.delete(obj)
    db.commit()
