import pytest

BASE_DRIVERS = "/api/v1/drivers"
BASE_ASSIGN = "/api/v1/driver-vehicle-assignments"
DRIVER_PAYLOAD = {
    "name": "John Driver",
    "license": "CDL-000001",
    "license_expiry": "2027-01-01",
    "phone": "555-0001",
    "status": "active",
}


def test_list_drivers_empty(authed_client):
    r = authed_client.get(BASE_DRIVERS)
    assert r.status_code == 200
    assert r.json() == []


def test_create_driver(authed_client):
    r = authed_client.post(BASE_DRIVERS, json=DRIVER_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["name"] == "John Driver"
    assert "id" in r.json()


def test_get_driver(authed_client):
    created = authed_client.post(BASE_DRIVERS, json=DRIVER_PAYLOAD).json()
    r = authed_client.get(f"{BASE_DRIVERS}/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_get_driver_not_found(authed_client):
    assert authed_client.get(f"{BASE_DRIVERS}/99999").status_code == 404


def test_update_driver(authed_client):
    created = authed_client.post(BASE_DRIVERS, json=DRIVER_PAYLOAD).json()
    updated = {**DRIVER_PAYLOAD, "status": "inactive"}
    r = authed_client.put(f"{BASE_DRIVERS}/{created['id']}", json=updated)
    assert r.status_code == 200
    assert r.json()["status"] == "inactive"


def test_delete_driver(authed_client):
    created = authed_client.post(BASE_DRIVERS, json=DRIVER_PAYLOAD).json()
    assert authed_client.delete(f"{BASE_DRIVERS}/{created['id']}").status_code == 204
    assert authed_client.get(f"{BASE_DRIVERS}/{created['id']}").status_code == 404


def test_driver_vehicle_assignment(authed_client):
    driver = authed_client.post(BASE_DRIVERS, json=DRIVER_PAYLOAD).json()
    vehicle = authed_client.post("/api/v1/vehicles", json={
        "year": 2022, "make": "IC Bus", "model": "CE", "license_plate": "DRV-001",
    }).json()

    payload = {
        "driver_id": driver["id"],
        "vehicle_id": vehicle["id"],
        "start_date": "2024-01-01",
    }
    r = authed_client.post(BASE_ASSIGN, json=payload)
    assert r.status_code == 201
    assert r.json()["driver_id"] == driver["id"]

    r = authed_client.get(f"{BASE_ASSIGN}?driver_id={driver['id']}")
    assert r.status_code == 200
    assert len(r.json()) == 1
