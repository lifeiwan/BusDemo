from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class VehicleBase(BaseModel):
    year: int
    make: str
    model: str
    vin: str = ""
    license_plate: str
    status: str = "active"  # active | maintenance | out_of_service
    mileage: int = 0
    color: str = ""


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── VehicleFixedCost ─────────────────────────────────────────────────────────

class VehicleFixedCostBase(BaseModel):
    vehicle_id: int
    type: str  # loan | eld | management_fee
    cost: float
    start_date: str  # YYYY-MM-DD
    notes: str = ""


class VehicleFixedCostCreate(VehicleFixedCostBase):
    pass


class VehicleFixedCostUpdate(VehicleFixedCostBase):
    pass


class VehicleFixedCostRead(VehicleFixedCostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── InsurancePolicy ───────────────────────────────────────────────────────────

class InsurancePolicyBase(BaseModel):
    vehicle_id: int
    provider: str = ""
    type: str  # monthly | yearly
    cost: float
    start_date: str
    notes: str = ""


class InsurancePolicyCreate(InsurancePolicyBase):
    pass


class InsurancePolicyUpdate(InsurancePolicyBase):
    pass


class InsurancePolicyRead(InsurancePolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── ParkingEntry ─────────────────────────────────────────────────────────────

class ParkingEntryBase(BaseModel):
    vehicle_id: int
    type: str  # monthly | one_time
    cost: float
    start_date: Optional[str] = None
    date: Optional[str] = None
    location: str = ""
    job_id: Optional[int] = None
    notes: str = ""


class ParkingEntryCreate(ParkingEntryBase):
    pass


class ParkingEntryUpdate(ParkingEntryBase):
    pass


class ParkingEntryRead(ParkingEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── MaintenanceEntry ──────────────────────────────────────────────────────────

class MaintenanceEntryBase(BaseModel):
    vehicle_id: int
    date: str
    type: str
    mileage: int = 0
    cost: float
    tech: str = ""
    notes: str = ""


class MaintenanceEntryCreate(MaintenanceEntryBase):
    pass


class MaintenanceEntryUpdate(MaintenanceEntryBase):
    pass


class MaintenanceEntryRead(MaintenanceEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── FuelEntry ─────────────────────────────────────────────────────────────────

class FuelEntryBase(BaseModel):
    vehicle_id: int
    date: str
    gallons: float
    cpg: float
    total: float
    odometer: int = 0
    full: bool = False


class FuelEntryCreate(FuelEntryBase):
    pass


class FuelEntryUpdate(FuelEntryBase):
    pass


class FuelEntryRead(FuelEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── Inspection ────────────────────────────────────────────────────────────────

class InspectionBase(BaseModel):
    vehicle_id: int
    date: str
    driver_name: str = ""
    results: dict[str, Any] = {}
    passed: bool = True
    notes: str = ""


class InspectionCreate(InspectionBase):
    pass


class InspectionUpdate(InspectionBase):
    pass


class InspectionRead(InspectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    # ORM stores this as pass_ (reserved word); map it to passed in the API
    passed: bool = Field(validation_alias="pass_")
    created_at: datetime
    updated_at: datetime
