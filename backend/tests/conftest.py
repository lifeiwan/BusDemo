import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "postgresql://evabus:evabus@localhost:5432/evabus_test")
os.environ.setdefault("FIREBASE_PROJECT_ID", "test-project")
os.environ.setdefault("FIREBASE_CREDENTIALS_PATH", "")

from app.main import app
from app.database import get_db
from app.models import Base

TEST_DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


from unittest.mock import patch as _patch


@pytest.fixture
def authed_client(db, client):
    """TestClient authenticated as an admin user with all permissions."""
    from app.models.company import Company
    from app.models.user import Role, Permission, RolePermission, User

    company = Company(name="Test Co")
    db.add(company)
    db.flush()

    resources = [
        "operations", "master-data", "vehicle-ops",
        "ga-expenses", "profit-center", "reports", "users",
    ]
    perms = []
    for resource in resources:
        for action in ("read", "write"):
            p = Permission(resource=resource, action=action)
            db.add(p)
            db.flush()
            perms.append(p)

    role = Role(company_id=company.id, name="admin")
    db.add(role)
    db.flush()

    for perm in perms:
        db.add(RolePermission(role_id=role.id, permission_id=perm.id))

    user = User(
        company_id=company.id,
        role_id=role.id,
        firebase_uid="admin-uid",
        email="admin@test.com",
    )
    db.add(user)
    db.flush()

    patcher = _patch(
        "app.middleware.auth.firebase_auth.verify_id_token",
        return_value={"uid": "admin-uid"},
    )
    patcher.start()
    yield client
    patcher.stop()
