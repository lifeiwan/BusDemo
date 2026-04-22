from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.job import JobGroup, Job, JobLineItem
from app.schemas.job import (
    JobGroupCreate, JobGroupRead, JobGroupUpdate,
    JobCreate, JobRead, JobUpdate,
    JobLineItemCreate, JobLineItemRead, JobLineItemUpdate,
)

groups_router = APIRouter(prefix="/job-groups", tags=["jobs"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])
items_router = APIRouter(prefix="/job-line-items", tags=["jobs"])


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


# ── Job Groups ────────────────────────────────────────────────────────────────

@groups_router.get("/", response_model=list[JobGroupRead])
def list_job_groups(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return db.query(JobGroup).filter(JobGroup.company_id == user.company_id).all()


@groups_router.post("/", response_model=JobGroupRead, status_code=201)
def create_job_group(
    body: JobGroupCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = JobGroup(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@groups_router.get("/{group_id}", response_model=JobGroupRead)
def get_job_group(
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")


@groups_router.put("/{group_id}", response_model=JobGroupRead)
def update_job_group(
    group_id: int,
    body: JobGroupUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@groups_router.delete("/{group_id}", status_code=204)
def delete_job_group(
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")
    db.delete(obj)
    db.commit()


# ── Jobs ──────────────────────────────────────────────────────────────────────

@jobs_router.get("/", response_model=list[JobRead])
def list_jobs(
    job_group_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    q = db.query(Job).filter(Job.company_id == user.company_id)
    if job_group_id is not None:
        q = q.filter(Job.job_group_id == job_group_id)
    if vehicle_id is not None:
        q = q.filter(Job.vehicle_id == vehicle_id)
    if driver_id is not None:
        q = q.filter(Job.driver_id == driver_id)
    return q.all()


@jobs_router.post("/", response_model=JobRead, status_code=201)
def create_job(
    body: JobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = Job(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@jobs_router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, Job, job_id, user.company_id, "Job")


@jobs_router.put("/{job_id}", response_model=JobRead)
def update_job(
    job_id: int,
    body: JobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, Job, job_id, user.company_id, "Job")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@jobs_router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, Job, job_id, user.company_id, "Job")
    db.delete(obj)
    db.commit()


# ── Job Line Items ─────────────────────────────────────────────────────────────

@items_router.get("/", response_model=list[JobLineItemRead])
def list_job_line_items(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    q = db.query(JobLineItem).filter(JobLineItem.company_id == user.company_id)
    if job_id is not None:
        q = q.filter(JobLineItem.job_id == job_id)
    return q.all()


@items_router.post("/", response_model=JobLineItemRead, status_code=201)
def create_job_line_item(
    body: JobLineItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = JobLineItem(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@items_router.get("/{item_id}", response_model=JobLineItemRead)
def get_job_line_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")


@items_router.put("/{item_id}", response_model=JobLineItemRead)
def update_job_line_item(
    item_id: int,
    body: JobLineItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@items_router.delete("/{item_id}", status_code=204)
def delete_job_line_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")
    db.delete(obj)
    db.commit()
