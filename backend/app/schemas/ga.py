from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class GaEntryBase(BaseModel):
    category: str
    date: str  # YYYY-MM-DD
    amount: Decimal
    notes: str = ""


class GaEntryCreate(GaEntryBase):
    pass


class GaEntryUpdate(GaEntryBase):
    pass


class GaEntryRead(GaEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
