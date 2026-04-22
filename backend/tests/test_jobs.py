import pytest

BASE_GROUPS = "/api/v1/job-groups"
BASE_JOBS = "/api/v1/jobs"
BASE_ITEMS = "/api/v1/job-line-items"

GROUP_PAYLOAD = {"name": "Airport Routes", "type": "route", "description": "Daily airport runs"}
JOB_PAYLOAD_TEMPLATE = {
    "name": "JFK Morning",
    "revenue": "5000.00",
    "driver_payroll": "1500.00",
    "payments_received": "5000.00",
    "recurrence": "daily",
    "start_date": "2024-01-01",
    "status": "active",
}


@pytest.fixture
def group_id(authed_client):
    r = authed_client.post(BASE_GROUPS, json=GROUP_PAYLOAD)
    return r.json()["id"]


@pytest.fixture
def job_id(authed_client, group_id):
    payload = {**JOB_PAYLOAD_TEMPLATE, "job_group_id": group_id}
    r = authed_client.post(BASE_JOBS, json=payload)
    return r.json()["id"]


# ── Job Groups ────────────────────────────────────────────────────────────────

def test_list_job_groups_empty(authed_client):
    assert authed_client.get(BASE_GROUPS).json() == []


def test_create_job_group(authed_client):
    r = authed_client.post(BASE_GROUPS, json=GROUP_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["name"] == "Airport Routes"


def test_get_job_group(authed_client, group_id):
    r = authed_client.get(f"{BASE_GROUPS}/{group_id}")
    assert r.status_code == 200
    assert r.json()["id"] == group_id


def test_get_job_group_not_found(authed_client):
    assert authed_client.get(f"{BASE_GROUPS}/99999").status_code == 404


def test_update_job_group(authed_client, group_id):
    updated = {**GROUP_PAYLOAD, "description": "Updated description"}
    r = authed_client.put(f"{BASE_GROUPS}/{group_id}", json=updated)
    assert r.status_code == 200
    assert r.json()["description"] == "Updated description"


def test_delete_job_group(authed_client, group_id):
    assert authed_client.delete(f"{BASE_GROUPS}/{group_id}").status_code == 204
    assert authed_client.get(f"{BASE_GROUPS}/{group_id}").status_code == 404


# ── Jobs ──────────────────────────────────────────────────────────────────────

def test_list_jobs_empty(authed_client, group_id):
    r = authed_client.get(f"{BASE_JOBS}?job_group_id={group_id}")
    assert r.status_code == 200
    assert r.json() == []


def test_create_job(authed_client, group_id):
    payload = {**JOB_PAYLOAD_TEMPLATE, "job_group_id": group_id}
    r = authed_client.post(BASE_JOBS, json=payload)
    assert r.status_code == 201
    assert r.json()["name"] == "JFK Morning"


def test_get_job_not_found(authed_client):
    assert authed_client.get(f"{BASE_JOBS}/99999").status_code == 404


def test_update_job(authed_client, group_id, job_id):
    payload = {**JOB_PAYLOAD_TEMPLATE, "job_group_id": group_id, "status": "completed"}
    r = authed_client.put(f"{BASE_JOBS}/{job_id}", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_delete_job(authed_client, group_id, job_id):
    assert authed_client.delete(f"{BASE_JOBS}/{job_id}").status_code == 204
    assert authed_client.get(f"{BASE_JOBS}/{job_id}").status_code == 404


# ── Job Line Items ─────────────────────────────────────────────────────────────

def test_create_job_line_item(authed_client, job_id):
    payload = {
        "job_id": job_id,
        "date": "2024-03-15",
        "category": "Toll",
        "direction": "cost",
        "amount": "25.00",
    }
    r = authed_client.post(BASE_ITEMS, json=payload)
    assert r.status_code == 201
    assert r.json()["category"] == "Toll"


def test_list_job_line_items_filter(authed_client, job_id):
    payload = {"job_id": job_id, "date": "2024-03-15", "category": "Toll", "direction": "cost", "amount": "25.00"}
    authed_client.post(BASE_ITEMS, json=payload)
    r = authed_client.get(f"{BASE_ITEMS}?job_id={job_id}")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_delete_job_line_item(authed_client, job_id):
    payload = {"job_id": job_id, "date": "2024-03-15", "category": "Toll", "direction": "cost", "amount": "25.00"}
    created = authed_client.post(BASE_ITEMS, json=payload).json()
    assert authed_client.delete(f"{BASE_ITEMS}/{created['id']}").status_code == 204
