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
