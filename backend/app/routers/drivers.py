from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.driver import Driver, DriverVehicleAssignment
from app.schemas.driver import (
    DriverCreate, DriverRead, DriverUpdate,
    DriverVehicleAssignmentCreate, DriverVehicleAssignmentRead, DriverVehicleAssignmentUpdate,
)

router = APIRouter(prefix="/drivers", tags=["drivers"])
assign_router = APIRouter(prefix="/driver-vehicle-assignments", tags=["drivers"])


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


@router.get("/", response_model=list[DriverRead])
def list_drivers(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Driver).filter(Driver.company_id == user.company_id).all()


@router.post("/", response_model=DriverRead, status_code=201)
def create_driver(
    body: DriverCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Driver(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{driver_id}", response_model=DriverRead)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, Driver, driver_id, user.company_id, "Driver")


@router.put("/{driver_id}", response_model=DriverRead)
def update_driver(
    driver_id: int,
    body: DriverUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, Driver, driver_id, user.company_id, "Driver")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{driver_id}", status_code=204)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, Driver, driver_id, user.company_id, "Driver")
    db.delete(obj)
    db.commit()


@assign_router.get("/", response_model=list[DriverVehicleAssignmentRead])
def list_assignments(
    driver_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    q = db.query(DriverVehicleAssignment).filter(
        DriverVehicleAssignment.company_id == user.company_id
    )
    if driver_id is not None:
        q = q.filter(DriverVehicleAssignment.driver_id == driver_id)
    if vehicle_id is not None:
        q = q.filter(DriverVehicleAssignment.vehicle_id == vehicle_id)
    return q.all()


@assign_router.post("/", response_model=DriverVehicleAssignmentRead, status_code=201)
def create_assignment(
    body: DriverVehicleAssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = DriverVehicleAssignment(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@assign_router.get("/{entry_id}", response_model=DriverVehicleAssignmentRead)
def get_assignment(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")


@assign_router.put("/{entry_id}", response_model=DriverVehicleAssignmentRead)
def update_assignment(
    entry_id: int,
    body: DriverVehicleAssignmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@assign_router.delete("/{entry_id}", status_code=204)
def delete_assignment(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")
    db.delete(obj)
    db.commit()
