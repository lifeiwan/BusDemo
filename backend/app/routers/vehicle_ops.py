from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.vehicle import (
    MaintenanceEntry, FuelEntry, Inspection,
    InsurancePolicy, ParkingEntry, VehicleFixedCost,
)
from app.models.driver import DriverCost
from app.schemas.vehicle import (
    MaintenanceEntryCreate, MaintenanceEntryRead, MaintenanceEntryUpdate,
    FuelEntryCreate, FuelEntryRead, FuelEntryUpdate,
    InspectionCreate, InspectionRead, InspectionUpdate,
    InsurancePolicyCreate, InsurancePolicyRead, InsurancePolicyUpdate,
    ParkingEntryCreate, ParkingEntryRead, ParkingEntryUpdate,
    VehicleFixedCostCreate, VehicleFixedCostRead, VehicleFixedCostUpdate,
)
from app.schemas.driver import DriverCostCreate, DriverCostRead, DriverCostUpdate


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


# ── Maintenance ───────────────────────────────────────────────────────────────

maint = APIRouter(prefix="/maintenance", tags=["vehicle-ops"])


@maint.get("/", response_model=list[MaintenanceEntryRead])
def list_maintenance(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(MaintenanceEntry.vehicle_id == vehicle_id)
    return q.all()


@maint.post("/", response_model=MaintenanceEntryRead, status_code=201)
def create_maintenance(
    body: MaintenanceEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = MaintenanceEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@maint.get("/{entry_id}", response_model=MaintenanceEntryRead)
def get_maintenance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")


@maint.put("/{entry_id}", response_model=MaintenanceEntryRead)
def update_maintenance(
    entry_id: int,
    body: MaintenanceEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@maint.delete("/{entry_id}", status_code=204)
def delete_maintenance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")
    db.delete(obj)
    db.commit()


# ── Fuel ──────────────────────────────────────────────────────────────────────

fuel = APIRouter(prefix="/fuel", tags=["vehicle-ops"])


@fuel.get("/", response_model=list[FuelEntryRead])
def list_fuel(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(FuelEntry).filter(FuelEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(FuelEntry.vehicle_id == vehicle_id)
    return q.all()


@fuel.post("/", response_model=FuelEntryRead, status_code=201)
def create_fuel(
    body: FuelEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = FuelEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@fuel.get("/{entry_id}", response_model=FuelEntryRead)
def get_fuel(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")


@fuel.put("/{entry_id}", response_model=FuelEntryRead)
def update_fuel(
    entry_id: int,
    body: FuelEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@fuel.delete("/{entry_id}", status_code=204)
def delete_fuel(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")
    db.delete(obj)
    db.commit()


# ── Inspections ───────────────────────────────────────────────────────────────

insp = APIRouter(prefix="/inspections", tags=["vehicle-ops"])


@insp.get("/", response_model=list[InspectionRead])
def list_inspections(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(Inspection).filter(Inspection.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(Inspection.vehicle_id == vehicle_id)
    return q.all()


@insp.post("/", response_model=InspectionRead, status_code=201)
def create_inspection(
    body: InspectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    data = body.model_dump()
    data["pass_"] = data.pop("passed")  # map API field to ORM attribute
    obj = Inspection(company_id=user.company_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@insp.get("/{entry_id}", response_model=InspectionRead)
def get_inspection(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")


@insp.put("/{entry_id}", response_model=InspectionRead)
def update_inspection(
    entry_id: int,
    body: InspectionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")
    data = body.model_dump()
    data["pass_"] = data.pop("passed")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@insp.delete("/{entry_id}", status_code=204)
def delete_inspection(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")
    db.delete(obj)
    db.commit()


# ── Insurance ─────────────────────────────────────────────────────────────────

ins = APIRouter(prefix="/insurance", tags=["vehicle-ops"])


@ins.get("/", response_model=list[InsurancePolicyRead])
def list_insurance(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(InsurancePolicy.vehicle_id == vehicle_id)
    return q.all()


@ins.post("/", response_model=InsurancePolicyRead, status_code=201)
def create_insurance(
    body: InsurancePolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = InsurancePolicy(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@ins.get("/{entry_id}", response_model=InsurancePolicyRead)
def get_insurance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")


@ins.put("/{entry_id}", response_model=InsurancePolicyRead)
def update_insurance(
    entry_id: int,
    body: InsurancePolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@ins.delete("/{entry_id}", status_code=204)
def delete_insurance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")
    db.delete(obj)
    db.commit()


# ── Parking ───────────────────────────────────────────────────────────────────

park = APIRouter(prefix="/parking", tags=["vehicle-ops"])


@park.get("/", response_model=list[ParkingEntryRead])
def list_parking(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(ParkingEntry).filter(ParkingEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(ParkingEntry.vehicle_id == vehicle_id)
    return q.all()


@park.post("/", response_model=ParkingEntryRead, status_code=201)
def create_parking(
    body: ParkingEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = ParkingEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@park.get("/{entry_id}", response_model=ParkingEntryRead)
def get_parking(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")


@park.put("/{entry_id}", response_model=ParkingEntryRead)
def update_parking(
    entry_id: int,
    body: ParkingEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@park.delete("/{entry_id}", status_code=204)
def delete_parking(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")
    db.delete(obj)
    db.commit()


# ── Vehicle Fixed Costs ───────────────────────────────────────────────────────

vfc = APIRouter(prefix="/vehicle-fixed-costs", tags=["vehicle-ops"])


@vfc.get("/", response_model=list[VehicleFixedCostRead])
def list_vehicle_fixed_costs(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(VehicleFixedCost.vehicle_id == vehicle_id)
    return q.all()


@vfc.post("/", response_model=VehicleFixedCostRead, status_code=201)
def create_vehicle_fixed_cost(
    body: VehicleFixedCostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = VehicleFixedCost(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@vfc.get("/{entry_id}", response_model=VehicleFixedCostRead)
def get_vehicle_fixed_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")


@vfc.put("/{entry_id}", response_model=VehicleFixedCostRead)
def update_vehicle_fixed_cost(
    entry_id: int,
    body: VehicleFixedCostUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@vfc.delete("/{entry_id}", status_code=204)
def delete_vehicle_fixed_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")
    db.delete(obj)
    db.commit()


# ── Driver Costs ──────────────────────────────────────────────────────────────

dcosts = APIRouter(prefix="/driver-costs", tags=["vehicle-ops"])


@dcosts.get("/", response_model=list[DriverCostRead])
def list_driver_costs(
    driver_id: Optional[int] = None,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(DriverCost).filter(DriverCost.company_id == user.company_id)
    if driver_id is not None:
        q = q.filter(DriverCost.driver_id == driver_id)
    if job_id is not None:
        q = q.filter(DriverCost.job_id == job_id)
    return q.all()


@dcosts.post("/", response_model=DriverCostRead, status_code=201)
def create_driver_cost(
    body: DriverCostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = DriverCost(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@dcosts.get("/{entry_id}", response_model=DriverCostRead)
def get_driver_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")


@dcosts.put("/{entry_id}", response_model=DriverCostRead)
def update_driver_cost(
    entry_id: int,
    body: DriverCostUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@dcosts.delete("/{entry_id}", status_code=204)
def delete_driver_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")
    db.delete(obj)
    db.commit()
