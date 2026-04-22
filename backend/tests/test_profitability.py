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
