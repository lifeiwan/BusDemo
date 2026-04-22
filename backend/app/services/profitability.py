from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.models.vehicle import (
    Vehicle, VehicleFixedCost, InsurancePolicy, ParkingEntry,
    MaintenanceEntry, FuelEntry,
)
from app.models.job import Job, JobGroup, JobLineItem
from app.models.driver import Driver
from app.models.customer import Customer
from app.schemas.reports import ProfitRow


# ── Date helpers ──────────────────────────────────────────────────────────────

def _in_range(date_str: str, from_date: str, to_date: str) -> bool:
    return from_date <= date_str <= to_date


def _active_jobs_in_range(jobs: list, from_date: str, to_date: str) -> list:
    return [
        j for j in jobs
        if j.start_date <= to_date and (j.end_date is None or j.end_date >= from_date)
    ]


def _months_in_range(from_date: str, to_date: str) -> int:
    """Number of calendar months partially or fully covered by the range."""
    from datetime import date
    s = date.fromisoformat(from_date[:7] + "-01")
    e = date.fromisoformat(to_date[:7] + "-01")
    return (e.year - s.year) * 12 + (e.month - s.month) + 1


# ── Cost helpers ──────────────────────────────────────────────────────────────

def _vehicle_costs_in_range(
    vehicle_id: int, from_date: str, to_date: str, months: int,
    fuel_entries: list, maintenance_entries: list,
    insurance_policies: list, vehicle_fixed_costs: list, parking_entries: list,
) -> Decimal:
    fuel = sum(
        (e.total for e in fuel_entries
         if e.vehicle_id == vehicle_id and _in_range(e.date, from_date, to_date)),
        Decimal("0"),
    )
    maintenance = sum(
        (e.cost for e in maintenance_entries
         if e.vehicle_id == vehicle_id and _in_range(e.date, from_date, to_date)),
        Decimal("0"),
    )
    # Insurance: prorated by months
    insurance_rate = sum(
        (p.cost if p.type == "monthly" else p.cost / Decimal("12")
         for p in insurance_policies if p.vehicle_id == vehicle_id),
        Decimal("0"),
    )
    insurance = insurance_rate * months
    # Fixed costs: prorated by months
    fixed = sum(
        (c.cost for c in vehicle_fixed_costs if c.vehicle_id == vehicle_id),
        Decimal("0"),
    ) * months
    # Parking
    parking = Decimal("0")
    for p in parking_entries:
        if p.vehicle_id != vehicle_id:
            continue
        if p.type == "monthly":
            parking += p.cost * months
        elif p.type == "one_time" and p.date and _in_range(p.date, from_date, to_date):
            parking += p.cost
    return fuel + maintenance + insurance + fixed + parking


def _job_revenue(job, job_line_items: list) -> Decimal:
    """Revenue for a job including all income line items (no date filter for profitability)."""
    base = job.revenue
    line_income = sum(
        (li.amount for li in job_line_items if li.job_id == job.id and li.direction == "income"),
        Decimal("0"),
    )
    return base + line_income


def _job_line_costs(job, job_line_items: list) -> Decimal:
    """All cost line items for a job (no date filter for profitability)."""
    return sum(
        (li.amount for li in job_line_items if li.job_id == job.id and li.direction == "cost"),
        Decimal("0"),
    )


# ── Dimension calculations ────────────────────────────────────────────────────

def _by_vehicle(
    vehicles, jobs, job_line_items, fuel_entries, maintenance_entries,
    insurance_policies, vehicle_fixed_costs, parking_entries,
    from_date: str, to_date: str,
) -> list[ProfitRow]:
    months = _months_in_range(from_date, to_date)
    active = _active_jobs_in_range(jobs, from_date, to_date)
    rows = []
    for v in vehicles:
        v_jobs = [j for j in active if j.vehicle_id == v.id]
        revenue = sum((_job_revenue(j, job_line_items) for j in v_jobs), Decimal("0"))
        line_costs = sum((_job_line_costs(j, job_line_items) for j in v_jobs), Decimal("0"))
        vehicle_costs = _vehicle_costs_in_range(
            v.id, from_date, to_date, months,
            fuel_entries, maintenance_entries, insurance_policies, vehicle_fixed_costs, parking_entries,
        )
        costs = line_costs + vehicle_costs
        net_profit = revenue - costs
        margin = float(net_profit / revenue * 100) if revenue else 0.0
        if v_jobs:
            rows.append(ProfitRow(
                id=v.id, label=f"{v.year} {v.make} {v.model}",
                revenue=revenue, costs=costs, net_profit=net_profit,
                margin=round(margin, 2), accounts_receivable=None,
            ))
    return sorted(rows, key=lambda r: r.net_profit, reverse=True)


def _by_job_group(
    job_groups, jobs, job_line_items, fuel_entries, maintenance_entries,
    insurance_policies, vehicle_fixed_costs, parking_entries,
    from_date: str, to_date: str,
) -> list[ProfitRow]:
    months = _months_in_range(from_date, to_date)
    active = _active_jobs_in_range(jobs, from_date, to_date)
    rows = []
    for jg in job_groups:
        jg_jobs = [j for j in active if j.job_group_id == jg.id]
        revenue = sum((_job_revenue(j, job_line_items) for j in jg_jobs), Decimal("0"))
        line_costs = sum((_job_line_costs(j, job_line_items) for j in jg_jobs), Decimal("0"))
        driver_costs = sum((j.driver_payroll for j in jg_jobs), Decimal("0"))
        unique_vids = {j.vehicle_id for j in jg_jobs if j.vehicle_id is not None}
        vehicle_costs = sum(
            _vehicle_costs_in_range(
                vid, from_date, to_date, months,
                fuel_entries, maintenance_entries, insurance_policies, vehicle_fixed_costs, parking_entries,
            )
            for vid in unique_vids
        )
        costs = line_costs + driver_costs + vehicle_costs
        net_profit = revenue - costs
        margin = float(net_profit / revenue * 100) if revenue else 0.0
        if revenue or costs:
            rows.append(ProfitRow(
                id=jg.id, label=jg.name,
                revenue=revenue, costs=costs, net_profit=net_profit,
                margin=round(margin, 2), accounts_receivable=None,
            ))
    return sorted(rows, key=lambda r: r.net_profit, reverse=True)


def _by_customer(
    customers, jobs, job_line_items, fuel_entries, maintenance_entries,
    insurance_policies, vehicle_fixed_costs, parking_entries,
    from_date: str, to_date: str,
) -> list[ProfitRow]:
    months = _months_in_range(from_date, to_date)
    active = _active_jobs_in_range(jobs, from_date, to_date)
    rows = []
    for c in customers:
        c_jobs = [j for j in active if j.customer_id == c.id]
        revenue = sum((_job_revenue(j, job_line_items) for j in c_jobs), Decimal("0"))
        line_costs = sum((_job_line_costs(j, job_line_items) for j in c_jobs), Decimal("0"))
        driver_costs = sum((j.driver_payroll for j in c_jobs), Decimal("0"))
        unique_vids = {j.vehicle_id for j in c_jobs if j.vehicle_id is not None}
        vehicle_costs = sum(
            _vehicle_costs_in_range(
                vid, from_date, to_date, months,
                fuel_entries, maintenance_entries, insurance_policies, vehicle_fixed_costs, parking_entries,
            )
            for vid in unique_vids
        )
        costs = line_costs + driver_costs + vehicle_costs
        net_profit = revenue - costs
        margin = float(net_profit / revenue * 100) if revenue else 0.0
        ar = sum((j.revenue - j.payments_received for j in c_jobs), Decimal("0"))
        if revenue or costs:
            rows.append(ProfitRow(
                id=c.id, label=c.name,
                revenue=revenue, costs=costs, net_profit=net_profit,
                margin=round(margin, 2), accounts_receivable=ar,
            ))
    return sorted(rows, key=lambda r: r.net_profit, reverse=True)


def _by_driver(
    drivers, jobs, job_line_items, from_date: str, to_date: str,
) -> list[ProfitRow]:
    active = _active_jobs_in_range(jobs, from_date, to_date)
    rows = []
    for d in drivers:
        d_jobs = [j for j in active if j.driver_id == d.id]
        revenue = sum((_job_revenue(j, job_line_items) for j in d_jobs), Decimal("0"))
        costs = sum((j.driver_payroll for j in d_jobs), Decimal("0"))
        net_profit = revenue - costs
        margin = float(net_profit / revenue * 100) if revenue else 0.0
        if revenue or costs:
            rows.append(ProfitRow(
                id=d.id, label=d.name,
                revenue=revenue, costs=costs, net_profit=net_profit,
                margin=round(margin, 2), accounts_receivable=None,
            ))
    return sorted(rows, key=lambda r: r.net_profit, reverse=True)


# ── Public API ────────────────────────────────────────────────────────────────

def compute_profitability(
    db: Session, company_id: int, from_date: str, to_date: str, dimension: str,
) -> list[ProfitRow]:
    jobs = db.query(Job).filter(Job.company_id == company_id).all()
    job_line_items = db.query(JobLineItem).filter(JobLineItem.company_id == company_id).all()
    fuel_entries = db.query(FuelEntry).filter(FuelEntry.company_id == company_id).all()
    maintenance_entries = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == company_id).all()
    insurance_policies = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == company_id).all()
    vehicle_fixed_costs = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == company_id).all()
    parking_entries = db.query(ParkingEntry).filter(ParkingEntry.company_id == company_id).all()

    if dimension == "vehicle":
        vehicles = db.query(Vehicle).filter(Vehicle.company_id == company_id).all()
        return _by_vehicle(
            vehicles, jobs, job_line_items, fuel_entries, maintenance_entries,
            insurance_policies, vehicle_fixed_costs, parking_entries, from_date, to_date,
        )
    elif dimension == "job-group":
        job_groups = db.query(JobGroup).filter(JobGroup.company_id == company_id).all()
        return _by_job_group(
            job_groups, jobs, job_line_items, fuel_entries, maintenance_entries,
            insurance_policies, vehicle_fixed_costs, parking_entries, from_date, to_date,
        )
    elif dimension == "customer":
        customers = db.query(Customer).filter(Customer.company_id == company_id).all()
        return _by_customer(
            customers, jobs, job_line_items, fuel_entries, maintenance_entries,
            insurance_policies, vehicle_fixed_costs, parking_entries, from_date, to_date,
        )
    elif dimension == "driver":
        drivers = db.query(Driver).filter(Driver.company_id == company_id).all()
        return _by_driver(drivers, jobs, job_line_items, from_date, to_date)
    else:
        raise ValueError(f"Unknown dimension: {dimension}")
