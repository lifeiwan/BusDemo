import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.user import Role, Permission, RolePermission, User


def _seed_company_and_user(db: Session, resource: str, action: str) -> dict:
    """Helper: create company, role with one permission, and user. Returns firebase_uid."""
    company = Company(name="Test Co")
    db.add(company)
    db.flush()

    perm = Permission(resource=resource, action=action)
    db.add(perm)
    db.flush()

    role = Role(company_id=company.id, name="manager")
    db.add(role)
    db.flush()

    db.add(RolePermission(role_id=role.id, permission_id=perm.id))

    user = User(
        company_id=company.id,
        role_id=role.id,
        firebase_uid="uid-abc",
        email="mgr@test.com",
        name="Manager",
    )
    db.add(user)
    db.flush()
    return {"firebase_uid": "uid-abc", "company_id": company.id}


def test_missing_token_returns_403(client):
    response = client.get("/api/v1/vehicles")
    assert response.status_code == 401


def test_invalid_token_returns_401(client):
    with patch("app.middleware.auth.firebase_auth.verify_id_token", side_effect=Exception("bad token")):
        response = client.get("/api/v1/vehicles", headers={"Authorization": "Bearer bad"})
        assert response.status_code == 401


def test_valid_token_with_permission_passes(client, db):
    _seed_company_and_user(db, "master-data", "read")
    mock_decoded = {"uid": "uid-abc"}

    with patch("app.middleware.auth.firebase_auth.verify_id_token", return_value=mock_decoded):
        response = client.get("/api/v1/vehicles", headers={"Authorization": "Bearer valid"})
        # 200 (empty list) because master-data:read is granted
        assert response.status_code == 200


def test_valid_token_without_permission_returns_403(client, db):
    _seed_company_and_user(db, "master-data", "read")  # granted master-data only
    mock_decoded = {"uid": "uid-abc"}

    with patch("app.middleware.auth.firebase_auth.verify_id_token", return_value=mock_decoded):
        response = client.get("/api/v1/reports/pl", headers={"Authorization": "Bearer valid"})
        assert response.status_code == 403
