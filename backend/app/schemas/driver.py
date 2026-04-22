from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DriverBase(BaseModel):
    name: str
    license: str = ""
    license_expiry: str = ""  # YYYY-MM-DD
    phone: str = ""
    status: str = "active"  # active | inactive


class DriverCreate(DriverBase):
    pass


class DriverUpdate(DriverBase):
    pass


class DriverRead(DriverBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class DriverVehicleAssignmentBase(BaseModel):
    driver_id: int
    vehicle_id: int
    start_date: str
    end_date: Optional[str] = None


class DriverVehicleAssignmentCreate(DriverVehicleAssignmentBase):
    pass


class DriverVehicleAssignmentUpdate(DriverVehicleAssignmentBase):
    pass


class DriverVehicleAssignmentRead(DriverVehicleAssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class DriverCostBase(BaseModel):
    driver_id: int
    job_id: Optional[int] = None
    date: str
    type: str  # salary | bonus | reimbursement | other
    amount: Decimal
    notes: str = ""


class DriverCostCreate(DriverCostBase):
    pass


class DriverCostUpdate(DriverCostBase):
    pass


class DriverCostRead(DriverCostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
