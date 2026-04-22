from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class JobGroupBase(BaseModel):
    name: str
    type: str = "route"  # route | one_time
    description: str = ""


class JobGroupCreate(JobGroupBase):
    pass


class JobGroupUpdate(JobGroupBase):
    pass


class JobGroupRead(JobGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class JobBase(BaseModel):
    name: str
    job_group_id: int
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    customer_id: Optional[int] = None
    revenue: Decimal = Decimal("0")
    driver_payroll: Decimal = Decimal("0")
    payments_received: Decimal = Decimal("0")
    recurrence: str = "one_time"  # daily | weekly | monthly | one_time
    start_date: str
    end_date: Optional[str] = None
    status: str = "active"  # active | completed | scheduled


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    pass


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class JobLineItemBase(BaseModel):
    job_id: int
    date: str
    category: str
    direction: str  # cost | income
    amount: Decimal
    notes: str = ""


class JobLineItemCreate(JobLineItemBase):
    pass


class JobLineItemUpdate(JobLineItemBase):
    pass


class JobLineItemRead(JobLineItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
