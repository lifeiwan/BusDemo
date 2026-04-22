import pytest

BASE_USERS = "/api/v1/users"
BASE_ROLES = "/api/v1/roles"


@pytest.fixture
def role_id(authed_client):
    """Get the ID of the admin role seeded by authed_client."""
    roles = authed_client.get(BASE_ROLES).json()
    return roles[0]["id"]


def test_list_roles(authed_client):
    r = authed_client.get(BASE_ROLES)
    assert r.status_code == 200
    # authed_client seeds 1 admin role
    assert len(r.json()) >= 1


def test_create_role(authed_client):
    payload = {"name": "viewer", "description": "Read-only access"}
    r = authed_client.post(BASE_ROLES, json=payload)
    assert r.status_code == 201
    assert r.json()["name"] == "viewer"


def test_get_role_not_found(authed_client):
    assert authed_client.get(f"{BASE_ROLES}/99999").status_code == 404


def test_update_role(authed_client, role_id):
    payload = {"name": "admin-updated", "description": "Updated"}
    r = authed_client.put(f"{BASE_ROLES}/{role_id}", json=payload)
    assert r.status_code == 200
    assert r.json()["name"] == "admin-updated"


def test_list_users(authed_client):
    r = authed_client.get(BASE_USERS)
    assert r.status_code == 200
    # authed_client seeds 1 user
    assert len(r.json()) >= 1


def test_create_user(authed_client, role_id):
    payload = {
        "firebase_uid": "new-firebase-uid-xyz",
        "email": "newuser@test.com",
        "name": "New User",
        "role_id": role_id,
        "is_active": True,
    }
    r = authed_client.post(BASE_USERS, json=payload)
    assert r.status_code == 201
    assert r.json()["email"] == "newuser@test.com"


def test_get_user_not_found(authed_client):
    assert authed_client.get(f"{BASE_USERS}/99999").status_code == 404


def test_update_user_active_status(authed_client, role_id):
    payload = {
        "firebase_uid": "uid-to-deactivate",
        "email": "deactivate@test.com",
        "name": "Soon Inactive",
        "role_id": role_id,
        "is_active": True,
    }
    created = authed_client.post(BASE_USERS, json=payload).json()
    update = {**payload, "is_active": False}
    r = authed_client.put(f"{BASE_USERS}/{created['id']}", json=update)
    assert r.status_code == 200
    assert r.json()["is_active"] is False
