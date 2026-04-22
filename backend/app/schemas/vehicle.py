from datetime import datetime
from pydantic import BaseModel, ConfigDict


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
