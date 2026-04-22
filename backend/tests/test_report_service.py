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
