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


# ── Vehicle Report ────────────────────────────────────────────────────────────

def _vehicle_row(v: Vehicle, v_jobs: list, job_line_items: list,
                 fuel_entries: list, maintenance_entries: list,
                 insurance_policies: list, vehicle_fixed_costs: list,
                 parking_entries: list, year: int, month: int) -> VehicleRow:
    v_job_ids = {j.id for j in v_jobs}

    revenue = sum((j.revenue for j in v_jobs), Decimal("0"))
    revenue += sum(
        (li.amount for li in job_line_items
         if li.job_id in v_job_ids and li.direction == "income" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    payroll = sum((j.driver_payroll for j in v_jobs), Decimal("0"))

    fuel = sum(
        (e.total for e in fuel_entries if e.vehicle_id == v.id and _in_month(e.date, year, month)),
        Decimal("0"),
    )

    repair = sum(
        (e.cost for e in maintenance_entries if e.vehicle_id == v.id and _in_month(e.date, year, month)),
        Decimal("0"),
    )

    others = sum(
        (li.amount for li in job_line_items
         if li.job_id in v_job_ids and li.direction == "cost"
         and li.category != "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    ez_pass = sum(
        (li.amount for li in job_line_items
         if li.job_id in v_job_ids and li.direction == "cost"
         and li.category == "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    insurance = _insurance_monthly(insurance_policies, v.id)
    management_fee = _fixed_by_type(vehicle_fixed_costs, "management_fee", v.id)
    loan = _fixed_by_type(vehicle_fixed_costs, "loan", v.id)
    parking = _parking_in_month(parking_entries, year, month, v.id)
    eld = _fixed_by_type(vehicle_fixed_costs, "eld", v.id)

    net = revenue - payroll - fuel - repair - others - ez_pass - insurance - management_fee - loan - parking - eld
    label = f"{v.year} {v.make} {v.model} ({v.license_plate})"

    return VehicleRow(
        vehicle_id=v.id, label=label, revenue=revenue, payroll=payroll,
        fuel=fuel, repair=repair, others=others, ez_pass=ez_pass,
        insurance=insurance, management_fee=management_fee, loan=loan,
        parking=parking, eld=eld, net=net,
    )


def build_vehicle_report(db: Session, company_id: int, year: int, month: int) -> list[VehicleRow]:
    """month is 1-indexed (1=Jan, 12=Dec)."""
    m = month - 1  # convert to 0-indexed for helpers
    vehicles = db.query(Vehicle).filter(Vehicle.company_id == company_id).all()
    jobs = db.query(Job).filter(Job.company_id == company_id).all()
    job_line_items = db.query(JobLineItem).filter(JobLineItem.company_id == company_id).all()
    fuel_entries = db.query(FuelEntry).filter(FuelEntry.company_id == company_id).all()
    maintenance_entries = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == company_id).all()
    insurance_policies = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == company_id).all()
    vehicle_fixed_costs = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == company_id).all()
    parking_entries = db.query(ParkingEntry).filter(ParkingEntry.company_id == company_id).all()

    active = _active_jobs_in_month(jobs, year, m)
    rows = [
        _vehicle_row(
            v, [j for j in active if j.vehicle_id == v.id],
            job_line_items, fuel_entries, maintenance_entries,
            insurance_policies, vehicle_fixed_costs, parking_entries, year, m,
        )
        for v in vehicles
    ]
    return sorted(rows, key=lambda r: r.revenue, reverse=True)


def build_vehicle_ytd_report(db: Session, company_id: int, year: int, month_count: int) -> list[VehicleRow]:
    """Accumulate vehicle rows for months 1..month_count."""
    acc: dict[int, VehicleRow] = {}
    for month in range(1, month_count + 1):
        for row in build_vehicle_report(db, company_id, year, month):
            if row.vehicle_id not in acc:
                acc[row.vehicle_id] = row
            else:
                e = acc[row.vehicle_id]
                acc[row.vehicle_id] = VehicleRow(
                    vehicle_id=e.vehicle_id, label=e.label,
                    revenue=e.revenue + row.revenue,
                    payroll=e.payroll + row.payroll,
                    fuel=e.fuel + row.fuel,
                    repair=e.repair + row.repair,
                    others=e.others + row.others,
                    ez_pass=e.ez_pass + row.ez_pass,
                    insurance=e.insurance + row.insurance,
                    management_fee=e.management_fee + row.management_fee,
                    loan=e.loan + row.loan,
                    parking=e.parking + row.parking,
                    eld=e.eld + row.eld,
                    net=e.net + row.net,
                )
    return sorted(acc.values(), key=lambda r: r.revenue, reverse=True)


# ── Job-Group Report ──────────────────────────────────────────────────────────

def _job_group_row(jg: JobGroup, jg_jobs: list, job_line_items: list,
                   fuel_entries: list, maintenance_entries: list,
                   insurance_policies: list, vehicle_fixed_costs: list,
                   parking_entries: list, year: int, month: int) -> JobGroupRow:
    jg_job_ids = {j.id for j in jg_jobs}
    vehicle_ids = {j.vehicle_id for j in jg_jobs if j.vehicle_id is not None}

    revenue = sum((j.revenue for j in jg_jobs), Decimal("0"))
    revenue += sum(
        (li.amount for li in job_line_items
         if li.job_id in jg_job_ids and li.direction == "income" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    payroll = sum((j.driver_payroll for j in jg_jobs), Decimal("0"))

    fuel = sum(
        (e.total for e in fuel_entries if e.vehicle_id in vehicle_ids and _in_month(e.date, year, month)),
        Decimal("0"),
    )

    repair = sum(
        (e.cost for e in maintenance_entries if e.vehicle_id in vehicle_ids and _in_month(e.date, year, month)),
        Decimal("0"),
    )

    others = sum(
        (li.amount for li in job_line_items
         if li.job_id in jg_job_ids and li.direction == "cost"
         and li.category != "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    ez_pass = sum(
        (li.amount for li in job_line_items
         if li.job_id in jg_job_ids and li.direction == "cost"
         and li.category == "EZ-Pass" and _in_month(li.date, year, month)),
        Decimal("0"),
    )

    insurance = sum((_insurance_monthly(insurance_policies, vid) for vid in vehicle_ids), Decimal("0"))
    management_fee = sum((_fixed_by_type(vehicle_fixed_costs, "management_fee", vid) for vid in vehicle_ids), Decimal("0"))
    loan = sum((_fixed_by_type(vehicle_fixed_costs, "loan", vid) for vid in vehicle_ids), Decimal("0"))
    parking = sum((_parking_in_month(parking_entries, year, month, vid) for vid in vehicle_ids), Decimal("0"))
    eld = sum((_fixed_by_type(vehicle_fixed_costs, "eld", vid) for vid in vehicle_ids), Decimal("0"))

    net = revenue - payroll - fuel - repair - others - ez_pass - insurance - management_fee - loan - parking - eld

    return JobGroupRow(
        job_group_id=jg.id, label=jg.name, revenue=revenue, payroll=payroll,
        fuel=fuel, repair=repair, others=others, ez_pass=ez_pass,
        insurance=insurance, management_fee=management_fee, loan=loan,
        parking=parking, eld=eld, net=net,
    )


def build_job_group_report(db: Session, company_id: int, year: int, month: int) -> list[JobGroupRow]:
    """month is 1-indexed."""
    m = month - 1
    job_groups = db.query(JobGroup).filter(JobGroup.company_id == company_id).all()
    jobs = db.query(Job).filter(Job.company_id == company_id).all()
    job_line_items = db.query(JobLineItem).filter(JobLineItem.company_id == company_id).all()
    fuel_entries = db.query(FuelEntry).filter(FuelEntry.company_id == company_id).all()
    maintenance_entries = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == company_id).all()
    insurance_policies = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == company_id).all()
    vehicle_fixed_costs = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == company_id).all()
    parking_entries = db.query(ParkingEntry).filter(ParkingEntry.company_id == company_id).all()

    active = _active_jobs_in_month(jobs, year, m)
    rows = [
        _job_group_row(
            jg, [j for j in active if j.job_group_id == jg.id],
            job_line_items, fuel_entries, maintenance_entries,
            insurance_policies, vehicle_fixed_costs, parking_entries, year, m,
        )
        for jg in job_groups
    ]
    return sorted(rows, key=lambda r: r.revenue, reverse=True)


def build_job_group_ytd_report(db: Session, company_id: int, year: int, month_count: int) -> list[JobGroupRow]:
    acc: dict[int, JobGroupRow] = {}
    for month in range(1, month_count + 1):
        for row in build_job_group_report(db, company_id, year, month):
            if row.job_group_id not in acc:
                acc[row.job_group_id] = row
            else:
                e = acc[row.job_group_id]
                acc[row.job_group_id] = JobGroupRow(
                    job_group_id=e.job_group_id, label=e.label,
                    revenue=e.revenue + row.revenue,
                    payroll=e.payroll + row.payroll,
                    fuel=e.fuel + row.fuel,
                    repair=e.repair + row.repair,
                    others=e.others + row.others,
                    ez_pass=e.ez_pass + row.ez_pass,
                    insurance=e.insurance + row.insurance,
                    management_fee=e.management_fee + row.management_fee,
                    loan=e.loan + row.loan,
                    parking=e.parking + row.parking,
                    eld=e.eld + row.eld,
                    net=e.net + row.net,
                )
    return sorted(acc.values(), key=lambda r: r.revenue, reverse=True)
