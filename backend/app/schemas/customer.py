from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    name: str
    contact_name: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
