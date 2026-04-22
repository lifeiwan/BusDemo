BASE = "/api/v1/ga-entries"
PAYLOAD = {"category": "Office Rent", "date": "2024-01-01", "amount": "2500.00"}


def test_list_ga_empty(authed_client):
    assert authed_client.get(BASE).json() == []


def test_create_ga_entry(authed_client):
    r = authed_client.post(BASE, json=PAYLOAD)
    assert r.status_code == 201
    assert r.json()["category"] == "Office Rent"
    assert "id" in r.json()


def test_get_ga_entry(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    r = authed_client.get(f"{BASE}/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_get_ga_entry_not_found(authed_client):
    assert authed_client.get(f"{BASE}/99999").status_code == 404


def test_update_ga_entry(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    updated = {**PAYLOAD, "amount": "2700.00"}
    r = authed_client.put(f"{BASE}/{created['id']}", json=updated)
    assert r.status_code == 200
    assert float(r.json()["amount"]) == 2700.0


def test_delete_ga_entry(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    assert authed_client.delete(f"{BASE}/{created['id']}").status_code == 204
    assert authed_client.get(f"{BASE}/{created['id']}").status_code == 404


def test_filter_ga_by_category(authed_client):
    authed_client.post(BASE, json={"category": "Rent", "date": "2024-01-01", "amount": "100.00"})
    authed_client.post(BASE, json={"category": "Utilities", "date": "2024-01-01", "amount": "50.00"})
    r = authed_client.get(f"{BASE}?category=Rent")
    assert r.status_code == 200
    assert all(e["category"] == "Rent" for e in r.json())
