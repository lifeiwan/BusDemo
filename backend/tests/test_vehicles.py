BASE = "/api/v1/vehicles"
PAYLOAD = {
    "year": 2022,
    "make": "Blue Bird",
    "model": "Vision",
    "license_plate": "TST-001",
}


def test_list_vehicles_empty(authed_client):
    r = authed_client.get(BASE)
    assert r.status_code == 200
    assert r.json() == []


def test_create_vehicle(authed_client):
    r = authed_client.post(BASE, json=PAYLOAD)
    assert r.status_code == 201
    data = r.json()
    assert data["license_plate"] == "TST-001"
    assert data["make"] == "Blue Bird"
    assert "id" in data
    assert "company_id" in data


def test_get_vehicle(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    r = authed_client.get(f"{BASE}/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_get_vehicle_not_found(authed_client):
    r = authed_client.get(f"{BASE}/99999")
    assert r.status_code == 404


def test_update_vehicle(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    updated = {**PAYLOAD, "mileage": 5000, "status": "maintenance"}
    r = authed_client.put(f"{BASE}/{created['id']}", json=updated)
    assert r.status_code == 200
    assert r.json()["mileage"] == 5000
    assert r.json()["status"] == "maintenance"


def test_delete_vehicle(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    r = authed_client.delete(f"{BASE}/{created['id']}")
    assert r.status_code == 204
    r = authed_client.get(f"{BASE}/{created['id']}")
    assert r.status_code == 404
