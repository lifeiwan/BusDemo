import pytest

VEHICLE_PAYLOAD = {
    "year": 2022, "make": "Blue Bird", "model": "Vision", "license_plate": "OPS-001",
}


@pytest.fixture
def vehicle_id(authed_client):
    """Create a vehicle and return its ID for use in vehicle-ops tests."""
    r = authed_client.post("/api/v1/vehicles", json=VEHICLE_PAYLOAD)
    return r.json()["id"]


# ── Maintenance ──────────────────────────────────────────────────────────────

def test_list_maintenance_empty(authed_client, vehicle_id):
    r = authed_client.get(f"/api/v1/maintenance?vehicle_id={vehicle_id}")
    assert r.status_code == 200
    assert r.json() == []


def test_create_maintenance(authed_client, vehicle_id):
    payload = {"vehicle_id": vehicle_id, "date": "2024-03-15", "type": "Oil Change", "cost": "150.00"}
    r = authed_client.post("/api/v1/maintenance", json=payload)
    assert r.status_code == 201
    assert r.json()["type"] == "Oil Change"


def test_get_maintenance_not_found(authed_client):
    assert authed_client.get("/api/v1/maintenance/99999").status_code == 404


def test_update_maintenance(authed_client, vehicle_id):
    payload = {"vehicle_id": vehicle_id, "date": "2024-03-15", "type": "Oil Change", "cost": "150.00"}
    created = authed_client.post("/api/v1/maintenance", json=payload).json()
    updated = {**payload, "cost": "200.00", "tech": "Bob"}
    r = authed_client.put(f"/api/v1/maintenance/{created['id']}", json=updated)
    assert r.status_code == 200
    assert r.json()["tech"] == "Bob"


def test_delete_maintenance(authed_client, vehicle_id):
    payload = {"vehicle_id": vehicle_id, "date": "2024-03-15", "type": "Oil Change", "cost": "150.00"}
    created = authed_client.post("/api/v1/maintenance", json=payload).json()
    assert authed_client.delete(f"/api/v1/maintenance/{created['id']}").status_code == 204
    assert authed_client.get(f"/api/v1/maintenance/{created['id']}").status_code == 404


# ── Fuel ─────────────────────────────────────────────────────────────────────

def test_create_fuel(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "date": "2024-03-15",
        "gallons": "50.500", "cpg": "3.899", "total": "196.90",
    }
    r = authed_client.post("/api/v1/fuel", json=payload)
    assert r.status_code == 201
    assert r.json()["vehicle_id"] == vehicle_id


def test_list_fuel_filter(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "date": "2024-03-15",
        "gallons": "50.500", "cpg": "3.899", "total": "196.90",
    }
    authed_client.post("/api/v1/fuel", json=payload)
    r = authed_client.get(f"/api/v1/fuel?vehicle_id={vehicle_id}")
    assert r.status_code == 200
    assert len(r.json()) == 1


# ── Inspections ───────────────────────────────────────────────────────────────

def test_create_inspection(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "date": "2024-03-15",
        "driver_name": "Jane", "results": {"lights": "ok", "brakes": "ok"}, "passed": True,
    }
    r = authed_client.post("/api/v1/inspections", json=payload)
    assert r.status_code == 201
    assert r.json()["passed"] is True
    assert r.json()["results"] == {"lights": "ok", "brakes": "ok"}


# ── Insurance ─────────────────────────────────────────────────────────────────

def test_create_insurance(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "type": "monthly",
        "cost": "500.00", "start_date": "2024-01-01",
    }
    r = authed_client.post("/api/v1/insurance", json=payload)
    assert r.status_code == 201
    assert r.json()["type"] == "monthly"


# ── Parking ───────────────────────────────────────────────────────────────────

def test_create_parking(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "type": "monthly",
        "cost": "200.00", "start_date": "2024-01-01",
    }
    r = authed_client.post("/api/v1/parking", json=payload)
    assert r.status_code == 201


# ── Vehicle Fixed Costs ───────────────────────────────────────────────────────

def test_create_vehicle_fixed_cost(authed_client, vehicle_id):
    payload = {
        "vehicle_id": vehicle_id, "type": "loan",
        "cost": "1200.00", "start_date": "2024-01-01",
    }
    r = authed_client.post("/api/v1/vehicle-fixed-costs", json=payload)
    assert r.status_code == 201
    assert r.json()["type"] == "loan"


# ── Driver Costs ──────────────────────────────────────────────────────────────

def test_create_driver_cost(authed_client, db):
    from app.models.user import User
    from app.models.driver import Driver

    # Reuse the company/user already seeded by authed_client fixture
    user = db.query(User).filter_by(firebase_uid="admin-uid").first()
    driver = Driver(company_id=user.company_id, name="Test Driver", status="active")
    db.add(driver)
    db.flush()

    payload = {
        "driver_id": driver.id, "date": "2024-03-15",
        "type": "salary", "amount": "3000.00",
    }
    r = authed_client.post("/api/v1/driver-costs", json=payload)
    assert r.status_code == 201
    assert r.json()["type"] == "salary"
