from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class PLMonthData(BaseModel):
    revenue: Decimal
    driver_payroll: Decimal
    fuel: Decimal
    maintenance: Decimal
    insurance: Decimal
    loan: Decimal
    eld: Decimal
    management_fee: Decimal
    parking: Decimal
    ez_pass: Decimal
    other_cogs: Decimal
    ga: dict[str, Decimal]  # category -> amount


class PLReport(BaseModel):
    year: int
    months: list[PLMonthData]  # 12 entries, index 0 = Jan, 11 = Dec


class VehicleRow(BaseModel):
    vehicle_id: int
    label: str
    revenue: Decimal
    payroll: Decimal
    fuel: Decimal
    repair: Decimal
    others: Decimal
    ez_pass: Decimal
    insurance: Decimal
    management_fee: Decimal
    loan: Decimal
    parking: Decimal
    eld: Decimal
    net: Decimal


class JobGroupRow(BaseModel):
    job_group_id: int
    label: str
    revenue: Decimal
    payroll: Decimal
    fuel: Decimal
    repair: Decimal
    others: Decimal
    ez_pass: Decimal
    insurance: Decimal
    management_fee: Decimal
    loan: Decimal
    parking: Decimal
    eld: Decimal
    net: Decimal


class ProfitRow(BaseModel):
    id: int
    label: str
    revenue: Decimal
    costs: Decimal
    net_profit: Decimal
    margin: float
    accounts_receivable: Optional[Decimal] = None
