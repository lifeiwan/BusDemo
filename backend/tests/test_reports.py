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
