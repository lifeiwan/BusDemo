from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


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
