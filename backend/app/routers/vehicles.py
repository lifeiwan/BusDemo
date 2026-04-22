from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=list[VehicleRead])
def list_vehicles(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Vehicle).filter(Vehicle.company_id == user.company_id).all()


@router.post("/", response_model=VehicleRead, status_code=201)
def create_vehicle(
    body: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Vehicle(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return obj


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(obj)
    db.commit()
