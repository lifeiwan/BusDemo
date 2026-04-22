BASE = "/api/v1/customers"
PAYLOAD = {
    "name": "Acme Corp",
    "contact_name": "Jane Smith",
    "email": "jane@acme.com",
    "phone": "555-0100",
}


def test_list_customers_empty(authed_client):
    r = authed_client.get(BASE)
    assert r.status_code == 200
    assert r.json() == []


def test_create_customer(authed_client):
    r = authed_client.post(BASE, json=PAYLOAD)
    assert r.status_code == 201
    assert r.json()["name"] == "Acme Corp"


def test_get_customer(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    r = authed_client.get(f"{BASE}/{created['id']}")
    assert r.status_code == 200


def test_get_customer_not_found(authed_client):
    assert authed_client.get(f"{BASE}/99999").status_code == 404


def test_update_customer(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    updated = {**PAYLOAD, "phone": "555-9999"}
    r = authed_client.put(f"{BASE}/{created['id']}", json=updated)
    assert r.status_code == 200
    assert r.json()["phone"] == "555-9999"


def test_delete_customer(authed_client):
    created = authed_client.post(BASE, json=PAYLOAD).json()
    assert authed_client.delete(f"{BASE}/{created['id']}").status_code == 204
    assert authed_client.get(f"{BASE}/{created['id']}").status_code == 404
