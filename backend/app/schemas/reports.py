from typing import Optional
from pydantic import BaseModel


class PLMonthData(BaseModel):
    revenue: float
    driver_payroll: float
    fuel: float
    maintenance: float
    insurance: float
    loan: float
    eld: float
    management_fee: float
    parking: float
    ez_pass: float
    other_cogs: float
    ga: dict[str, float]  # category -> amount


class PLReport(BaseModel):
    year: int
    months: list[PLMonthData]  # 12 entries, index 0 = Jan, 11 = Dec


class VehicleRow(BaseModel):
    vehicle_id: int
    label: str
    revenue: float
    payroll: float
    fuel: float
    repair: float
    others: float
    ez_pass: float
    insurance: float
    management_fee: float
    loan: float
    parking: float
    eld: float
    net: float


class JobGroupRow(BaseModel):
    job_group_id: int
    label: str
    revenue: float
    payroll: float
    fuel: float
    repair: float
    others: float
    ez_pass: float
    insurance: float
    management_fee: float
    loan: float
    parking: float
    eld: float
    net: float


class ProfitRow(BaseModel):
    id: int
    label: str
    revenue: float
    costs: float
    net_profit: float
    margin: float
    accounts_receivable: Optional[float] = None
