# Reports & Profitability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the frontend `profit.ts`/`report.ts` computation into Python service functions and expose it through 4 FastAPI endpoints.

**Architecture:** Two service files (`report.py`, `profitability.py`) hold pure computation logic. Two routers (`reports.py`, `profitability.py`) handle HTTP only. Pydantic response schemas live in `app/schemas/reports.py`. Services are tested directly with the DB fixture; routers are tested via HTTP with `authed_client`.

**Tech Stack:** Python 3.11, FastAPI 0.110, SQLAlchemy 2.0, Pydantic 2.6, pytest 8

---

## File Map

**New files:**
```
backend/
├── app/
│   ├── services/
│   │   ├── __init__.py
│   │   ├── report.py          # P&L, vehicle, job-group computation
│   │   └── profitability.py   # profitability by dimension
│   ├── schemas/
│   │   └── reports.py         # response Pydantic models
│   └── routers/
│       ├── reports.py         # /api/v1/reports/pl, /vehicle, /job-group
│       └── profitability.py   # /api/v1/profitability
└── tests/
    ├── test_report_service.py  # unit tests for report.py (no HTTP)
    ├── test_profitability_service.py  # unit tests for profitability.py (no HTTP)
    ├── test_reports.py         # HTTP tests for /reports/*
    └── test_profitability.py   # HTTP tests for /profitability
```

**Modified:**
- `backend/app/main.py` — add two `include_router` calls (Task 5)

---

## Key computation rules (applies to all tasks)

- **Active job in month:** `job.start_date <= month_end AND (job.end_date IS NULL OR job.end_date >= month_start)`
- **Revenue per month:** job base `revenue` (for every active month) + income `job_line_items` with `date` in that month
- **Monthly insurance:** `cost × 1` if `type=monthly`; `cost ÷ 12` if `type=yearly`
- **Monthly fixed costs (loan/eld/management_fee):** `cost × 1` per month
- **Monthly parking:** `cost × 1` if `type=monthly`; `cost` only if `date` is in month if `type=one_time`
- **EZ-Pass:** `job_line_items` with `direction=cost` and `category="EZ-Pass"`, filtered by date in month
- **Other COGS:** `job_line_items` with `direction=cost` and `category≠"EZ-Pass"`, filtered by date in month
- **Profitability line items:** NOT filtered by date — uses all line items for active jobs in range
- **Profitability vehicle costs:** fuel + maintenance filtered by date range; insurance/fixed/parking prorated by `months_in_range`
- **Profitability driver costs:** included in job-group/customer/driver dimensions; excluded from vehicle dimension

---

### Task 1: Schemas + P&L Service + Service Tests

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/schemas/reports.py`
- Create: `backend/app/services/report.py` (P&L portion only)
- Create: `backend/tests/test_report_service.py`

- [ ] **Step 1: Create `backend/app/services/__init__.py`** (empty file)

- [ ] **Step 2: Create `backend/app/schemas/reports.py`**

```python
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
```

- [ ] **Step 3: Write the failing P&L service tests**

Create `backend/tests/test_report_service.py`:

```python
from decimal import Decimal
import pytest
from app.models.company import Company
from app.models.vehicle import Vehicle, InsurancePolicy, VehicleFixedCost, FuelEntry
from app.models.job import JobGroup, Job
from app.models.ga import GaEntry
from app.services.report import build_pl_report


def _seed(db):
    """Seed 1 company, 1 vehicle, 1 job, 1 fuel entry, 1 insurance policy, 1 fixed cost."""
    company = Company(name="Test Co")
    db.add(company)
    db.flush()

    vehicle = Vehicle(
        company_id=company.id, year=2022, make="Blue Bird",
        model="Vision", license_plate="SVC-001",
    )
    db.add(vehicle)
    db.flush()

    jg = JobGroup(company_id=company.id, name="Route A", type="route")
    db.add(jg)
    db.flush()

    job = Job(
        company_id=company.id, job_group_id=jg.id, vehicle_id=vehicle.id,
        name="Test Job", revenue=Decimal("5000.00"),
        driver_payroll=Decimal("1500.00"),
        payments_received=Decimal("5000.00"),
        start_date="2025-01-01",
        # no end_date — active in all months of 2025
    )
    db.add(job)
    db.flush()

    # Fuel entry only in January
    db.add(FuelEntry(
        company_id=company.id, vehicle_id=vehicle.id,
        date="2025-01-15", gallons=Decimal("50"),
        cpg=Decimal("3.50"), total=Decimal("175.00"),
    ))

    # Monthly insurance
    db.add(InsurancePolicy(
        company_id=company.id, vehicle_id=vehicle.id,
        type="monthly", cost=Decimal("400.00"), start_date="2025-01-01",
    ))

    # Loan fixed cost
    db.add(VehicleFixedCost(
        company_id=company.id, vehicle_id=vehicle.id,
        type="loan", cost=Decimal("800.00"), start_date="2025-01-01",
    ))

    # G&A entry in January only
    db.add(GaEntry(
        company_id=company.id, category="Office Rent",
        date="2025-01-05", amount=Decimal("2500.00"),
    ))

    db.flush()
    return company.id


def test_pl_report_has_12_months(db):
    company_id = _seed(db)
    report = build_pl_report(db, company_id, 2025)
    assert len(report.months) == 12
    assert report.year == 2025


def test_pl_report_january_revenue_and_costs(db):
    company_id = _seed(db)
    report = build_pl_report(db, company_id, 2025)
    jan = report.months[0]
    assert jan.revenue == Decimal("5000.00")
    assert jan.driver_payroll == Decimal("1500.00")
    assert jan.fuel == Decimal("175.00")
    assert jan.insurance == Decimal("400.00")
    assert jan.loan == Decimal("800.00")
    assert jan.ga == {"Office Rent": Decimal("2500.00")}


def test_pl_report_february_no_fuel_no_ga(db):
    """Job is still active in Feb (no end_date), but fuel entry and GA are Jan-only."""
    company_id = _seed(db)
    report = build_pl_report(db, company_id, 2025)
    feb = report.months[1]
    assert feb.revenue == Decimal("5000.00")  # same ongoing job
    assert feb.fuel == Decimal("0.00")        # no fuel entry in Feb
    assert feb.ga == {}                       # no GA entries in Feb


def test_pl_report_empty_year(db):
    """Year with no data returns 12 zero months."""
    company = Company(name="Empty Co")
    db.add(company)
    db.flush()
    report = build_pl_report(db, company.id, 2030)
    assert len(report.months) == 12
    assert report.months[0].revenue == Decimal("0")
```

- [ ] **Step 4: Run the failing tests**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/test_report_service.py -v
```

Expected: `ImportError: cannot import name 'build_pl_report'`

- [ ] **Step 5: Create `backend/app/services/report.py`** (P&L portion)

```python
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
```

- [ ] **Step 6: Run the P&L tests — expect pass**

```bash
pytest tests/test_report_service.py -v
```

Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
git add app/services/__init__.py app/schemas/reports.py app/services/report.py tests/test_report_service.py
git commit -m "feat(backend): reports schemas + P&L service"
```

---

### Task 2: Vehicle + Job-Group Report Service

**Files:**
- Extend: `backend/app/services/report.py` (append vehicle and job-group functions)
- Extend: `backend/tests/test_report_service.py` (append vehicle and job-group tests)

- [ ] **Step 1: Append vehicle + job-group tests to `backend/tests/test_report_service.py`**

Add these tests at the bottom of the file (the `_seed` helper is already defined above):

```python
from app.services.report import build_vehicle_report, build_vehicle_ytd_report, build_job_group_report, build_job_group_ytd_report


def test_vehicle_report_january(db):
    company_id = _seed(db)
    rows = build_vehicle_report(db, company_id, 2025, 1)
    assert len(rows) == 1
    row = rows[0]
    assert row.vehicle_id is not None
    assert row.revenue == Decimal("5000.00")
    assert row.payroll == Decimal("1500.00")
    assert row.fuel == Decimal("175.00")
    assert row.insurance == Decimal("400.00")
    assert row.loan == Decimal("800.00")
    assert row.repair == Decimal("0.00")
    assert row.others == Decimal("0.00")
    assert row.ez_pass == Decimal("0.00")
    assert row.eld == Decimal("0.00")
    assert row.management_fee == Decimal("0.00")
    assert row.parking == Decimal("0.00")
    # net = 5000 - 1500 - 175 - 0 - 0 - 0 - 400 - 0 - 800 - 0 - 0 = 2125
    assert row.net == Decimal("2125.00")


def test_vehicle_report_ytd_two_months(db):
    company_id = _seed(db)
    # Jan: fuel=175; Feb: fuel=0 (no entry in Feb). Insurance and loan apply both months.
    rows = build_vehicle_ytd_report(db, company_id, 2025, 2)
    assert len(rows) == 1
    row = rows[0]
    assert row.revenue == Decimal("10000.00")   # 5000 × 2 months
    assert row.fuel == Decimal("175.00")        # only Jan has a fuel entry
    assert row.insurance == Decimal("800.00")   # 400 × 2
    assert row.loan == Decimal("1600.00")       # 800 × 2


def test_job_group_report_january(db):
    company_id = _seed(db)
    rows = build_job_group_report(db, company_id, 2025, 1)
    assert len(rows) == 1
    row = rows[0]
    assert row.job_group_id is not None
    assert row.revenue == Decimal("5000.00")
    assert row.payroll == Decimal("1500.00")
    assert row.fuel == Decimal("175.00")
    assert row.insurance == Decimal("400.00")
    assert row.loan == Decimal("800.00")
    # net = 5000 - 1500 - 175 - 0 - 0 - 0 - 400 - 0 - 800 - 0 - 0 = 2125
    assert row.net == Decimal("2125.00")


def test_job_group_ytd_two_months(db):
    company_id = _seed(db)
    rows = build_job_group_ytd_report(db, company_id, 2025, 2)
    assert len(rows) == 1
    row = rows[0]
    assert row.revenue == Decimal("10000.00")
    assert row.insurance == Decimal("800.00")
```

- [ ] **Step 2: Run the new tests — expect ImportError**

```bash
pytest tests/test_report_service.py -v
```

Expected: `ImportError` for `build_vehicle_report` etc.

- [ ] **Step 3: Append vehicle + job-group functions to `backend/app/services/report.py`**

Add after the `build_pl_report` function:

```python
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
```

- [ ] **Step 4: Run all service tests**

```bash
pytest tests/test_report_service.py -v
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
git add app/services/report.py tests/test_report_service.py
git commit -m "feat(backend): vehicle and job-group report service"
```

---

### Task 3: Profitability Service + Service Tests

**Files:**
- Create: `backend/app/services/profitability.py`
- Create: `backend/tests/test_profitability_service.py`

- [ ] **Step 1: Write the failing profitability service tests**

Create `backend/tests/test_profitability_service.py`:

```python
from decimal import Decimal
import pytest
from app.models.company import Company
from app.models.vehicle import Vehicle, InsurancePolicy, VehicleFixedCost, FuelEntry
from app.models.job import JobGroup, Job
from app.models.driver import Driver
from app.models.customer import Customer
from app.services.profitability import compute_profitability


def _seed(db):
    """Seed company, vehicle, driver, customer, job for profitability tests."""
    company = Company(name="Profit Co")
    db.add(company)
    db.flush()

    vehicle = Vehicle(
        company_id=company.id, year=2022, make="Blue Bird",
        model="Vision", license_plate="PRF-001",
    )
    db.add(vehicle)
    db.flush()

    driver = Driver(company_id=company.id, name="Test Driver", status="active")
    db.add(driver)
    db.flush()

    customer = Customer(company_id=company.id, name="Acme Corp")
    db.add(customer)
    db.flush()

    jg = JobGroup(company_id=company.id, name="Route A", type="route")
    db.add(jg)
    db.flush()

    job = Job(
        company_id=company.id, job_group_id=jg.id, vehicle_id=vehicle.id,
        driver_id=driver.id, customer_id=customer.id,
        name="Test Job", revenue=Decimal("5000.00"),
        driver_payroll=Decimal("1500.00"),
        payments_received=Decimal("4000.00"),  # AR = 1000
        start_date="2025-01-01",
    )
    db.add(job)
    db.flush()

    # Fuel entry in range
    db.add(FuelEntry(
        company_id=company.id, vehicle_id=vehicle.id,
        date="2025-01-15", gallons=Decimal("50"),
        cpg=Decimal("3.50"), total=Decimal("175.00"),
    ))

    # Monthly insurance
    db.add(InsurancePolicy(
        company_id=company.id, vehicle_id=vehicle.id,
        type="monthly", cost=Decimal("400.00"), start_date="2025-01-01",
    ))

    # Loan fixed cost
    db.add(VehicleFixedCost(
        company_id=company.id, vehicle_id=vehicle.id,
        type="loan", cost=Decimal("800.00"), start_date="2025-01-01",
    ))

    db.flush()
    return company.id


def test_profitability_by_vehicle(db):
    """Vehicle dimension: costs = vehicle_costs + line_costs (NO driver payroll)."""
    company_id = _seed(db)
    rows = compute_profitability(db, company_id, "2025-01-01", "2025-01-31", "vehicle")
    assert len(rows) == 1
    row = rows[0]
    assert row.revenue == Decimal("5000.00")
    # Vehicle costs for 1 month: fuel=175, insurance=400*1, loan=800*1 = 1375
    # Line costs = 0, driver payroll NOT included
    assert row.costs == Decimal("1375.00")
    assert row.net_profit == Decimal("3625.00")
    assert row.accounts_receivable is None


def test_profitability_by_job_group(db):
    """Job-group dimension: costs include driver payroll."""
    company_id = _seed(db)
    rows = compute_profitability(db, company_id, "2025-01-01", "2025-01-31", "job-group")
    assert len(rows) == 1
    row = rows[0]
    # vehicle costs=1375, driver_payroll=1500, line_costs=0 → costs=2875
    assert row.costs == Decimal("2875.00")
    assert row.net_profit == Decimal("2125.00")
    assert row.accounts_receivable is None


def test_profitability_by_customer(db):
    """Customer dimension: accounts_receivable = revenue - payments_received."""
    company_id = _seed(db)
    rows = compute_profitability(db, company_id, "2025-01-01", "2025-01-31", "customer")
    assert len(rows) == 1
    row = rows[0]
    assert row.label == "Acme Corp"
    assert row.accounts_receivable == Decimal("1000.00")  # 5000 - 4000


def test_profitability_by_driver(db):
    """Driver dimension: costs = driver_payroll only."""
    company_id = _seed(db)
    rows = compute_profitability(db, company_id, "2025-01-01", "2025-01-31", "driver")
    assert len(rows) == 1
    row = rows[0]
    assert row.costs == Decimal("1500.00")
    assert row.net_profit == Decimal("3500.00")
    assert row.accounts_receivable is None


def test_profitability_no_results_outside_range(db):
    """Job active Jan 2025 — a range in 2024 returns empty."""
    company_id = _seed(db)
    rows = compute_profitability(db, company_id, "2024-01-01", "2024-12-31", "vehicle")
    assert rows == []
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/test_profitability_service.py -v
```

Expected: `ImportError: cannot import name 'compute_profitability'`

- [ ] **Step 3: Create `backend/app/services/profitability.py`**

```python
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
        if revenue or costs:
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
```

- [ ] **Step 4: Run profitability service tests**

```bash
pytest tests/test_profitability_service.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
pytest tests/ -v
```

Expected: all 65 + 13 = 78 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
git add app/services/profitability.py tests/test_profitability_service.py
git commit -m "feat(backend): profitability service (vehicle/job-group/customer/driver)"
```

---

### Task 4: Reports Router + HTTP Tests

**Files:**
- Create: `backend/app/routers/reports.py`
- Create: `backend/tests/test_reports.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the failing HTTP tests**

Create `backend/tests/test_reports.py`:

```python
import pytest
from decimal import Decimal
from app.models.company import Company
from app.models.vehicle import Vehicle, InsurancePolicy
from app.models.job import JobGroup, Job


@pytest.fixture
def seeded(authed_client, db):
    """Seed minimal data and return the authed_client for use in tests."""
    from app.models.user import User
    user = db.query(User).filter_by(firebase_uid="admin-uid").first()
    cid = user.company_id

    vehicle = Vehicle(company_id=cid, year=2022, make="Blue Bird", model="Vision", license_plate="RPT-001")
    db.add(vehicle)
    db.flush()

    jg = JobGroup(company_id=cid, name="Route A", type="route")
    db.add(jg)
    db.flush()

    job = Job(
        company_id=cid, job_group_id=jg.id, vehicle_id=vehicle.id,
        name="Test Job", revenue=Decimal("5000.00"),
        driver_payroll=Decimal("1500.00"),
        payments_received=Decimal("5000.00"),
        start_date="2025-01-01",
    )
    db.add(job)

    db.add(InsurancePolicy(
        company_id=cid, vehicle_id=vehicle.id,
        type="monthly", cost=Decimal("400.00"), start_date="2025-01-01",
    ))
    db.flush()

    return authed_client


def test_pl_report(seeded):
    r = seeded.get("/api/v1/reports/pl?year=2025")
    assert r.status_code == 200
    body = r.json()
    assert body["year"] == 2025
    assert len(body["months"]) == 12
    jan = body["months"][0]
    assert "revenue" in jan
    assert "driver_payroll" in jan
    assert "ga" in jan
    assert float(jan["revenue"]) == 5000.0


def test_vehicle_report_month(seeded):
    r = seeded.get("/api/v1/reports/vehicle?year=2025&month=1")
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert len(rows) == 1
    row = rows[0]
    assert "vehicle_id" in row
    assert "label" in row
    assert "net" in row
    assert float(row["revenue"]) == 5000.0


def test_vehicle_report_ytd(seeded):
    r = seeded.get("/api/v1/reports/vehicle?year=2025&ytd=true")
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert len(rows) == 1


def test_vehicle_report_invalid_both_params(seeded):
    r = seeded.get("/api/v1/reports/vehicle?year=2025&month=1&ytd=true")
    assert r.status_code == 422


def test_vehicle_report_invalid_neither_param(seeded):
    r = seeded.get("/api/v1/reports/vehicle?year=2025")
    assert r.status_code == 422


def test_job_group_report_month(seeded):
    r = seeded.get("/api/v1/reports/job-group?year=2025&month=1")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert "job_group_id" in rows[0]
    assert "net" in rows[0]


def test_job_group_report_ytd(seeded):
    r = seeded.get("/api/v1/reports/job-group?year=2025&ytd=true")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_reports_require_auth(client):
    r = client.get("/api/v1/reports/pl?year=2025")
    assert r.status_code == 401
```

- [ ] **Step 2: Run — expect 404 (routes not registered yet)**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/test_reports.py -v
```

Expected: failures (404 or connection errors — routes don't exist).

- [ ] **Step 3: Create `backend/app/routers/reports.py`**

```python
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.schemas.reports import PLReport, VehicleRow, JobGroupRow
from app.services.report import (
    build_pl_report,
    build_vehicle_report,
    build_vehicle_ytd_report,
    build_job_group_report,
    build_job_group_ytd_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/pl", response_model=PLReport)
def pl_report(
    year: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    return build_pl_report(db, user.company_id, year)


@router.get("/vehicle", response_model=list[VehicleRow])
def vehicle_report(
    year: int,
    month: Optional[int] = None,
    ytd: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    if month is not None and ytd is not None:
        raise HTTPException(status_code=422, detail="Provide either month or ytd=true, not both")
    if month is None and ytd is None:
        raise HTTPException(status_code=422, detail="Provide either month (1-12) or ytd=true")
    if ytd:
        today = date.today()
        month_count = today.month if year == today.year else 12
        return build_vehicle_ytd_report(db, user.company_id, year, month_count)
    return build_vehicle_report(db, user.company_id, year, month)


@router.get("/job-group", response_model=list[JobGroupRow])
def job_group_report(
    year: int,
    month: Optional[int] = None,
    ytd: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("reports", "read")),
):
    if month is not None and ytd is not None:
        raise HTTPException(status_code=422, detail="Provide either month or ytd=true, not both")
    if month is None and ytd is None:
        raise HTTPException(status_code=422, detail="Provide either month (1-12) or ytd=true")
    if ytd:
        today = date.today()
        month_count = today.month if year == today.year else 12
        return build_job_group_ytd_report(db, user.company_id, year, month_count)
    return build_job_group_report(db, user.company_id, year, month)
```

- [ ] **Step 4: Add reports router to `backend/app/main.py`**

Read current `main.py`, then add after the last `include_router` call and before the end of the file:

```python
from app.routers import reports as reports_router
```

Add to the import block at the top. Then add after `users_router.users_router`:

```python
app.include_router(reports_router.router, prefix="/api/v1")
```

Full updated `main.py`:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router
from app.routers import users as users_router
from app.routers import reports as reports_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")
app.include_router(users_router.roles_router, prefix="/api/v1")
app.include_router(users_router.users_router, prefix="/api/v1")
app.include_router(reports_router.router, prefix="/api/v1")
```

- [ ] **Step 5: Run reports HTTP tests**

```bash
pytest tests/test_reports.py -v
```

Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
git add app/routers/reports.py tests/test_reports.py app/main.py
git commit -m "feat(backend): reports router (/reports/pl, /reports/vehicle, /reports/job-group)"
```

---

### Task 5: Profitability Router + HTTP Tests + Full Suite

**Files:**
- Create: `backend/app/routers/profitability.py`
- Create: `backend/tests/test_profitability.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the failing HTTP tests**

Create `backend/tests/test_profitability.py`:

```python
import pytest
from decimal import Decimal
from app.models.company import Company
from app.models.vehicle import Vehicle, InsurancePolicy
from app.models.job import JobGroup, Job
from app.models.customer import Customer


@pytest.fixture
def seeded(authed_client, db):
    from app.models.user import User
    user = db.query(User).filter_by(firebase_uid="admin-uid").first()
    cid = user.company_id

    vehicle = Vehicle(company_id=cid, year=2022, make="Blue Bird", model="Vision", license_plate="PLT-001")
    db.add(vehicle)
    db.flush()

    customer = Customer(company_id=cid, name="Acme Corp")
    db.add(customer)
    db.flush()

    jg = JobGroup(company_id=cid, name="Route A", type="route")
    db.add(jg)
    db.flush()

    job = Job(
        company_id=cid, job_group_id=jg.id, vehicle_id=vehicle.id,
        customer_id=customer.id,
        name="Test Job", revenue=Decimal("5000.00"),
        driver_payroll=Decimal("1500.00"),
        payments_received=Decimal("4000.00"),
        start_date="2025-01-01",
    )
    db.add(job)

    db.add(InsurancePolicy(
        company_id=cid, vehicle_id=vehicle.id,
        type="monthly", cost=Decimal("400.00"), start_date="2025-01-01",
    ))
    db.flush()

    return authed_client


def test_profitability_by_vehicle(seeded):
    r = seeded.get("/api/v1/profitability?from=2025-01-01&to=2025-01-31&dimension=vehicle")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    row = rows[0]
    assert "id" in row
    assert "label" in row
    assert "revenue" in row
    assert "costs" in row
    assert "net_profit" in row
    assert "margin" in row
    assert row["accounts_receivable"] is None
    assert float(row["revenue"]) == 5000.0


def test_profitability_by_customer(seeded):
    r = seeded.get("/api/v1/profitability?from=2025-01-01&to=2025-01-31&dimension=customer")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["label"] == "Acme Corp"
    # accounts_receivable = 5000 - 4000 = 1000
    assert float(rows[0]["accounts_receivable"]) == 1000.0


def test_profitability_invalid_dimension(seeded):
    r = seeded.get("/api/v1/profitability?from=2025-01-01&to=2025-01-31&dimension=invalid")
    assert r.status_code == 422


def test_profitability_missing_dimension(seeded):
    r = seeded.get("/api/v1/profitability?from=2025-01-01&to=2025-01-31")
    assert r.status_code == 422


def test_profitability_requires_auth(client):
    r = client.get("/api/v1/profitability?from=2025-01-01&to=2025-01-31&dimension=vehicle")
    assert r.status_code == 401
```

- [ ] **Step 2: Run — expect failures (routes not registered)**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/test_profitability.py -v
```

Expected: failures.

- [ ] **Step 3: Create `backend/app/routers/profitability.py`**

```python
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.schemas.reports import ProfitRow
from app.services.profitability import compute_profitability

router = APIRouter(prefix="/profitability", tags=["profitability"])

VALID_DIMENSIONS = {"vehicle", "job-group", "customer", "driver"}


@router.get("/", response_model=list[ProfitRow])
def profitability(
    from_: str = None,
    to: str = None,
    dimension: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("profit-center", "read")),
):
    if dimension is None or dimension not in VALID_DIMENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"dimension must be one of: {', '.join(sorted(VALID_DIMENSIONS))}",
        )
    return compute_profitability(db, user.company_id, from_, to, dimension)
```

Wait — FastAPI uses query parameter names directly, and `from` is a Python reserved word. Use an alias:

```python
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.schemas.reports import ProfitRow
from app.services.profitability import compute_profitability

router = APIRouter(prefix="/profitability", tags=["profitability"])

VALID_DIMENSIONS = {"vehicle", "job-group", "customer", "driver"}


@router.get("/", response_model=list[ProfitRow])
def profitability(
    from_date: Annotated[str, Query(alias="from")],
    to_date: Annotated[str, Query(alias="to")],
    dimension: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("profit-center", "read")),
):
    if dimension not in VALID_DIMENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"dimension must be one of: {', '.join(sorted(VALID_DIMENSIONS))}",
        )
    return compute_profitability(db, user.company_id, from_date, to_date, dimension)
```

- [ ] **Step 4: Update `backend/app/main.py`** — add profitability router

Replace the full `main.py`:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router
from app.routers import users as users_router
from app.routers import reports as reports_router
from app.routers import profitability as profitability_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")
app.include_router(users_router.roles_router, prefix="/api/v1")
app.include_router(users_router.users_router, prefix="/api/v1")
app.include_router(reports_router.router, prefix="/api/v1")
app.include_router(profitability_router.router, prefix="/api/v1")
```

- [ ] **Step 5: Run profitability HTTP tests**

```bash
pytest tests/test_profitability.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Run full test suite**

```bash
pytest tests/ -v
```

Expected: all tests pass. Count: 65 existing + 8 P&L service + 13 profitability service + 8 reports HTTP + 5 profitability HTTP = ~99 tests.

- [ ] **Step 7: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
git add app/routers/profitability.py tests/test_profitability.py app/main.py
git commit -m "feat(backend): profitability router + wire all report endpoints — Plan 3 complete"
```

---

## Self-Review

**Spec coverage:**
- `GET /api/v1/reports/pl?year=` ✅ Task 4
- `GET /api/v1/reports/vehicle?year=&month=` ✅ Task 4
- `GET /api/v1/reports/vehicle?year=&ytd=true` ✅ Task 4
- `GET /api/v1/reports/job-group?year=&month=` ✅ Task 4
- `GET /api/v1/reports/job-group?year=&ytd=true` ✅ Task 4
- `GET /api/v1/profitability?from=&to=&dimension=` ✅ Task 5
- Service layer (`report.py`, `profitability.py`) ✅ Tasks 1-3
- Schemas (`reports.py`) ✅ Task 1
- Permission enforcement (`reports` for /reports/*, `profit-center` for /profitability) ✅ Tasks 4-5
- YTD month-count logic (current month for current year, 12 for past years) ✅ Task 4

**Placeholder scan:** None found. All steps have complete code.

**Type consistency:**
- `VehicleRow.vehicle_id` used consistently in Task 1 (schema), Task 2 (service), Task 4 (router + tests)
- `JobGroupRow.job_group_id` consistent across Tasks 1, 2, 4
- `ProfitRow.net_profit` (not `netProfit`) consistent across Tasks 1, 3, 5
- `_vehicle_costs_in_range` defined in Task 3, used only in Task 3 (internal to profitability.py)
- `build_pl_report`, `build_vehicle_report`, `build_vehicle_ytd_report`, `build_job_group_report`, `build_job_group_ytd_report` defined in Tasks 1-2, imported in Task 4
- `compute_profitability` defined in Task 3, imported in Task 5
