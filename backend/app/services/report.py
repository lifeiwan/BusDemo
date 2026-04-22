import calendar
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.models.vehicle import (
    Vehicle, VehicleFixedCost, InsurancePolicy,
    ParkingEntry, MaintenanceEntry, FuelEntry,
)
from app.models.job import Job, JobGroup, JobLineItem
from app.models.ga import GaEntry
from app.schemas.reports import PLMonthData, PLReport, VehicleRow, JobGroupRow


# ── Date helpers ──────────────────────────────────────────────────────────────

def _month_start(year: int, month: int) -> str:
    """month is 0-indexed (0=Jan). Returns YYYY-MM-DD."""
    return f"{year}-{month + 1:02d}-01"


def _month_end(year: int, month: int) -> str:
    last = calendar.monthrange(year, month + 1)[1]
    return f"{year}-{month + 1:02d}-{last:02d}"


def _in_month(date_str: str, year: int, month: int) -> bool:
    return date_str.startswith(f"{year}-{month + 1:02d}-")


def _active_jobs_in_month(jobs: list, year: int, month: int) -> list:
    start = _month_start(year, month)
    end = _month_end(year, month)
    return [j for j in jobs if j.start_date <= end and (j.end_date is None or j.end_date >= start)]


# ── Cost helpers ──────────────────────────────────────────────────────────────

def _insurance_monthly(policies: list, vehicle_id: Optional[int] = None) -> Decimal:
    filtered = [p for p in policies if vehicle_id is None or p.vehicle_id == vehicle_id]
    total = Decimal("0")
    for p in filtered:
        total += p.cost if p.type == "monthly" else p.cost / Decimal("12")
    return total


def _parking_in_month(entries: list, year: int, month: int, vehicle_id: Optional[int] = None) -> Decimal:
    filtered = [e for e in entries if vehicle_id is None or e.vehicle_id == vehicle_id]
    total = Decimal("0")
    for e in filtered:
        if e.type == "monthly":
            total += e.cost
        elif e.type == "one_time" and e.date and _in_month(e.date, year, month):
            total += e.cost
    return total


def _fixed_by_type(fixed_costs: list, type_: str, vehicle_id: Optional[int] = None) -> Decimal:
    return sum(
        (c.cost for c in fixed_costs if c.type == type_ and (vehicle_id is None or c.vehicle_id == vehicle_id)),
        Decimal("0"),
    )


# ── P&L ───────────────────────────────────────────────────────────────────────

def _compute_pl_month(
    year: int, month: int,
    jobs: list, job_line_items: list, fuel_entries: list,
    maintenance_entries: list, insurance_policies: list,
    vehicle_fixed_costs: list, parking_entries: list, ga_entries: list,
) -> PLMonthData:
    active = _active_jobs_in_month(jobs, year, month)
    active_ids = {j.id for j in active}

    revenue = sum((j.revenue for j in active), Decimal("0"))
    revenue += sum(
        (li.amount for li in job_line_items
         if li.job_id in active_ids and li.direction == "income" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    driver_payroll = sum((j.driver_payroll for j in active), Decimal("0"))

    fuel = sum(
        (e.total for e in fuel_entries if _in_month(e.date, year, month)),
        Decimal("0"),
    )

    maintenance = sum(
        (e.cost for e in maintenance_entries if _in_month(e.date, year, month)),
        Decimal("0"),
    )

    insurance = _insurance_monthly(insurance_policies)
    loan = _fixed_by_type(vehicle_fixed_costs, "loan")
    eld = _fixed_by_type(vehicle_fixed_costs, "eld")
    management_fee = _fixed_by_type(vehicle_fixed_costs, "management_fee")
    parking = _parking_in_month(parking_entries, year, month)

    ez_pass = sum(
        (li.amount for li in job_line_items
         if li.direction == "cost" and li.category == "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    other_cogs = sum(
        (li.amount for li in job_line_items
         if li.direction == "cost" and li.category != "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    ga: dict[str, Decimal] = {}
    for e in ga_entries:
        if _in_month(e.date, year, month):
            ga[e.category] = ga.get(e.category, Decimal("0")) + e.amount

    return PLMonthData(
        revenue=revenue, driver_payroll=driver_payroll, fuel=fuel,
        maintenance=maintenance, insurance=insurance, loan=loan,
        eld=eld, management_fee=management_fee, parking=parking,
        ez_pass=ez_pass, other_cogs=other_cogs, ga=ga,
    )


def build_pl_report(db: Session, company_id: int, year: int) -> PLReport:
    jobs = db.query(Job).filter(Job.company_id == company_id).all()
    job_line_items = db.query(JobLineItem).filter(JobLineItem.company_id == company_id).all()
    fuel_entries = db.query(FuelEntry).filter(FuelEntry.company_id == company_id).all()
    maintenance_entries = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == company_id).all()
    insurance_policies = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == company_id).all()
    vehicle_fixed_costs = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == company_id).all()
    parking_entries = db.query(ParkingEntry).filter(ParkingEntry.company_id == company_id).all()
    ga_entries = db.query(GaEntry).filter(GaEntry.company_id == company_id).all()

    months = [
        _compute_pl_month(
            year, m, jobs, job_line_items, fuel_entries,
            maintenance_entries, insurance_policies,
            vehicle_fixed_costs, parking_entries, ga_entries,
        )
        for m in range(12)
    ]
    return PLReport(year=year, months=months)
