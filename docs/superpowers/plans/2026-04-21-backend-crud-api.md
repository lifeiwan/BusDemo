# Backend CRUD API Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pydantic schemas and CRUD routers for all 17 API resource groups, wired into FastAPI with RBAC permission enforcement and `company_id` scoping.

**Architecture:** One schema file per domain (vehicle, driver, customer, job, ga, user), one router file per domain. Routers are thin HTTP layers — no business logic. Every route depends on `require_permission()` from `app.middleware.auth` and filters all DB queries by `user.company_id`. Tests share an `authed_client` pytest fixture (admin user, mocked Firebase) added to `conftest.py` in Task 1.

**Tech Stack:** Python 3.11, FastAPI 0.110, SQLAlchemy 2.0, Pydantic 2.6, pytest 8, httpx 0.27

---

## File Map

**New files:**
```
backend/
├── app/
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── vehicle.py     Vehicle + VehicleFixedCost + InsurancePolicy + ParkingEntry + MaintenanceEntry + FuelEntry + Inspection
│   │   ├── driver.py      Driver + DriverVehicleAssignment + DriverCost
│   │   ├── customer.py    Customer
│   │   ├── job.py         JobGroup + Job + JobLineItem
│   │   ├── ga.py          GaEntry
│   │   └── user.py        User + Role
│   └── routers/
│       ├── __init__.py
│       ├── vehicles.py        /api/v1/vehicles
│       ├── vehicle_ops.py     /api/v1/maintenance, /fuel, /inspections, /insurance, /parking, /vehicle-fixed-costs, /driver-costs
│       ├── drivers.py         /api/v1/drivers, /driver-vehicle-assignments
│       ├── customers.py       /api/v1/customers
│       ├── jobs.py            /api/v1/job-groups, /jobs, /job-line-items
│       ├── ga.py              /api/v1/ga-entries
│       └── users.py           /api/v1/users, /roles
├── tests/
│   ├── test_vehicles.py
│   ├── test_vehicle_ops.py
│   ├── test_drivers.py
│   ├── test_customers.py
│   ├── test_jobs.py
│   ├── test_ga.py
│   └── test_users.py
```

**Modified files:**
- `backend/tests/conftest.py` — add `authed_client` fixture (Task 1)
- `backend/app/main.py` — include all routers, remove stub routes (Task 8)

---

## Permission Mapping

| Router file | Endpoints | Permission resource |
|---|---|---|
| vehicles.py | /vehicles | master-data |
| vehicle_ops.py | /maintenance, /fuel, /inspections, /insurance, /parking, /vehicle-fixed-costs, /driver-costs | vehicle-ops |
| drivers.py | /drivers, /driver-vehicle-assignments | master-data |
| customers.py | /customers | master-data |
| jobs.py | /job-groups, /jobs, /job-line-items | operations |
| ga.py | /ga-entries | ga-expenses |
| users.py | /users, /roles | users |

Read routes: `require_permission(resource, "read")`. Write routes (POST/PUT/DELETE): `require_permission(resource, "write")`.

---

### Task 1: authed_client Fixture + Empty Scaffold

**Files:**
- Modify: `backend/tests/conftest.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/routers/__init__.py`

- [ ] **Step 1: Add `authed_client` fixture to `backend/tests/conftest.py`**

Append the following to the existing `conftest.py` (after all existing code). Do NOT replace any existing code.

```python
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
```

- [ ] **Step 2: Create `backend/app/schemas/__init__.py`** (empty file)

- [ ] **Step 3: Create `backend/app/routers/__init__.py`** (empty file)

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd /path/to/BusDemo/backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/ -v
```

Expected: 5 passed (test_health + 4 auth tests).

- [ ] **Step 5: Commit**

```bash
git add backend/tests/conftest.py backend/app/schemas/__init__.py backend/app/routers/__init__.py
git commit -m "feat(backend): authed_client fixture + schemas/routers scaffold"
```

---

### Task 2: Vehicle Schemas + Router + Tests

**Files:**
- Create: `backend/app/schemas/vehicle.py`
- Create: `backend/app/routers/vehicles.py`
- Create: `backend/tests/test_vehicles.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_vehicles.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_vehicles.py -v
# Expected: errors because /api/v1/vehicles (stub) returns [] only — POST/PUT/DELETE missing
```

- [ ] **Step 3: Create `backend/app/schemas/vehicle.py`**

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VehicleBase(BaseModel):
    year: int
    make: str
    model: str
    vin: str = ""
    license_plate: str
    status: str = "active"  # active | maintenance | out_of_service
    mileage: int = 0
    color: str = ""


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/routers/vehicles.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("/", response_model=list[VehicleRead])
def list_vehicles(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Vehicle).filter(Vehicle.company_id == user.company_id).all()


@router.post("/", response_model=VehicleRead, status_code=201)
def create_vehicle(
    body: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Vehicle(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return obj


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.company_id == user.company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(obj)
    db.commit()
```

- [ ] **Step 5: Register the router in `backend/app/main.py`**

Add these two lines after the existing imports and before `app = FastAPI(...)`. Also remove the stub `/api/v1/vehicles` route.

Current `main.py` full replacement:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router

# Initialize Firebase Admin SDK once at startup
if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")


# Stub route used by auth tests — will be removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 6: Run vehicle tests**

```bash
pytest tests/test_vehicles.py -v
```

Expected: 6 passed.

- [ ] **Step 7: Run full suite**

```bash
pytest tests/ -v
```

Expected: 11 passed (6 vehicle + 4 auth + 1 health).

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/vehicle.py backend/app/routers/vehicles.py backend/tests/test_vehicles.py backend/app/main.py
git commit -m "feat(backend): vehicle schema, router, and CRUD tests"
```

---

### Task 3: Vehicle Ops Schemas + Router + Tests

Vehicle ops covers: maintenance entries, fuel entries, inspections, insurance policies, parking entries, vehicle fixed costs, driver costs. All use `vehicle-ops` permission.

**Files:**
- Extend: `backend/app/schemas/vehicle.py` (add ops schemas)
- Create: `backend/app/schemas/driver.py` (DriverCost only, for this task)
- Create: `backend/app/routers/vehicle_ops.py`
- Create: `backend/tests/test_vehicle_ops.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_vehicle_ops.py`:

```python
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
    from app.models.company import Company
    from app.models.user import Role, Permission, RolePermission, User
    from app.models.driver import Driver

    # Reuse the company/user already seeded by authed_client fixture
    # We just need a driver in the same company
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_vehicle_ops.py -v
# Expected: errors because the routes don't exist yet
```

- [ ] **Step 3: Add ops schemas to `backend/app/schemas/vehicle.py`**

Append to the existing `backend/app/schemas/vehicle.py` (after the Vehicle schemas):

```python
from decimal import Decimal
from typing import Any, Optional
from pydantic import Field


# ── VehicleFixedCost ─────────────────────────────────────────────────────────

class VehicleFixedCostBase(BaseModel):
    vehicle_id: int
    type: str  # loan | eld | management_fee
    cost: Decimal
    start_date: str  # YYYY-MM-DD
    notes: str = ""


class VehicleFixedCostCreate(VehicleFixedCostBase):
    pass


class VehicleFixedCostUpdate(VehicleFixedCostBase):
    pass


class VehicleFixedCostRead(VehicleFixedCostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── InsurancePolicy ───────────────────────────────────────────────────────────

class InsurancePolicyBase(BaseModel):
    vehicle_id: int
    provider: str = ""
    type: str  # monthly | yearly
    cost: Decimal
    start_date: str
    notes: str = ""


class InsurancePolicyCreate(InsurancePolicyBase):
    pass


class InsurancePolicyUpdate(InsurancePolicyBase):
    pass


class InsurancePolicyRead(InsurancePolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── ParkingEntry ─────────────────────────────────────────────────────────────

class ParkingEntryBase(BaseModel):
    vehicle_id: int
    type: str  # monthly | one_time
    cost: Decimal
    start_date: Optional[str] = None
    date: Optional[str] = None
    location: str = ""
    job_id: Optional[int] = None
    notes: str = ""


class ParkingEntryCreate(ParkingEntryBase):
    pass


class ParkingEntryUpdate(ParkingEntryBase):
    pass


class ParkingEntryRead(ParkingEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── MaintenanceEntry ──────────────────────────────────────────────────────────

class MaintenanceEntryBase(BaseModel):
    vehicle_id: int
    date: str
    type: str
    mileage: int = 0
    cost: Decimal
    tech: str = ""
    notes: str = ""


class MaintenanceEntryCreate(MaintenanceEntryBase):
    pass


class MaintenanceEntryUpdate(MaintenanceEntryBase):
    pass


class MaintenanceEntryRead(MaintenanceEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── FuelEntry ─────────────────────────────────────────────────────────────────

class FuelEntryBase(BaseModel):
    vehicle_id: int
    date: str
    gallons: Decimal
    cpg: Decimal
    total: Decimal
    odometer: int = 0
    full: bool = False


class FuelEntryCreate(FuelEntryBase):
    pass


class FuelEntryUpdate(FuelEntryBase):
    pass


class FuelEntryRead(FuelEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


# ── Inspection ────────────────────────────────────────────────────────────────

class InspectionBase(BaseModel):
    vehicle_id: int
    date: str
    driver_name: str = ""
    results: dict[str, Any] = {}
    passed: bool = True
    notes: str = ""


class InspectionCreate(InspectionBase):
    pass


class InspectionUpdate(InspectionBase):
    pass


class InspectionRead(InspectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    # ORM stores this as pass_ (reserved word); map it to passed in the API
    passed: bool = Field(validation_alias="pass_")
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/schemas/driver.py`** (DriverCost only — Driver and DriverVehicleAssignment added in Task 4)

```python
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DriverCostBase(BaseModel):
    driver_id: int
    job_id: Optional[int] = None
    date: str
    type: str  # salary | bonus | reimbursement | other
    amount: Decimal
    notes: str = ""


class DriverCostCreate(DriverCostBase):
    pass


class DriverCostUpdate(DriverCostBase):
    pass


class DriverCostRead(DriverCostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 5: Create `backend/app/routers/vehicle_ops.py`**

```python
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.vehicle import (
    MaintenanceEntry, FuelEntry, Inspection,
    InsurancePolicy, ParkingEntry, VehicleFixedCost,
)
from app.models.driver import DriverCost
from app.schemas.vehicle import (
    MaintenanceEntryCreate, MaintenanceEntryRead, MaintenanceEntryUpdate,
    FuelEntryCreate, FuelEntryRead, FuelEntryUpdate,
    InspectionCreate, InspectionRead, InspectionUpdate,
    InsurancePolicyCreate, InsurancePolicyRead, InsurancePolicyUpdate,
    ParkingEntryCreate, ParkingEntryRead, ParkingEntryUpdate,
    VehicleFixedCostCreate, VehicleFixedCostRead, VehicleFixedCostUpdate,
)
from app.schemas.driver import DriverCostCreate, DriverCostRead, DriverCostUpdate


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


# ── Maintenance ───────────────────────────────────────────────────────────────

maint = APIRouter(prefix="/maintenance", tags=["vehicle-ops"])


@maint.get("/", response_model=list[MaintenanceEntryRead])
def list_maintenance(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(MaintenanceEntry).filter(MaintenanceEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(MaintenanceEntry.vehicle_id == vehicle_id)
    return q.all()


@maint.post("/", response_model=MaintenanceEntryRead, status_code=201)
def create_maintenance(
    body: MaintenanceEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = MaintenanceEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@maint.get("/{entry_id}", response_model=MaintenanceEntryRead)
def get_maintenance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")


@maint.put("/{entry_id}", response_model=MaintenanceEntryRead)
def update_maintenance(
    entry_id: int,
    body: MaintenanceEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@maint.delete("/{entry_id}", status_code=204)
def delete_maintenance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, MaintenanceEntry, entry_id, user.company_id, "Maintenance entry")
    db.delete(obj)
    db.commit()


# ── Fuel ──────────────────────────────────────────────────────────────────────

fuel = APIRouter(prefix="/fuel", tags=["vehicle-ops"])


@fuel.get("/", response_model=list[FuelEntryRead])
def list_fuel(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(FuelEntry).filter(FuelEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(FuelEntry.vehicle_id == vehicle_id)
    return q.all()


@fuel.post("/", response_model=FuelEntryRead, status_code=201)
def create_fuel(
    body: FuelEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = FuelEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@fuel.get("/{entry_id}", response_model=FuelEntryRead)
def get_fuel(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")


@fuel.put("/{entry_id}", response_model=FuelEntryRead)
def update_fuel(
    entry_id: int,
    body: FuelEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@fuel.delete("/{entry_id}", status_code=204)
def delete_fuel(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, FuelEntry, entry_id, user.company_id, "Fuel entry")
    db.delete(obj)
    db.commit()


# ── Inspections ───────────────────────────────────────────────────────────────

insp = APIRouter(prefix="/inspections", tags=["vehicle-ops"])


@insp.get("/", response_model=list[InspectionRead])
def list_inspections(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(Inspection).filter(Inspection.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(Inspection.vehicle_id == vehicle_id)
    return q.all()


@insp.post("/", response_model=InspectionRead, status_code=201)
def create_inspection(
    body: InspectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    data = body.model_dump()
    data["pass_"] = data.pop("passed")  # map API field to ORM attribute
    obj = Inspection(company_id=user.company_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@insp.get("/{entry_id}", response_model=InspectionRead)
def get_inspection(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")


@insp.put("/{entry_id}", response_model=InspectionRead)
def update_inspection(
    entry_id: int,
    body: InspectionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")
    data = body.model_dump()
    data["pass_"] = data.pop("passed")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@insp.delete("/{entry_id}", status_code=204)
def delete_inspection(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, Inspection, entry_id, user.company_id, "Inspection")
    db.delete(obj)
    db.commit()


# ── Insurance ─────────────────────────────────────────────────────────────────

ins = APIRouter(prefix="/insurance", tags=["vehicle-ops"])


@ins.get("/", response_model=list[InsurancePolicyRead])
def list_insurance(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(InsurancePolicy).filter(InsurancePolicy.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(InsurancePolicy.vehicle_id == vehicle_id)
    return q.all()


@ins.post("/", response_model=InsurancePolicyRead, status_code=201)
def create_insurance(
    body: InsurancePolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = InsurancePolicy(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@ins.get("/{entry_id}", response_model=InsurancePolicyRead)
def get_insurance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")


@ins.put("/{entry_id}", response_model=InsurancePolicyRead)
def update_insurance(
    entry_id: int,
    body: InsurancePolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@ins.delete("/{entry_id}", status_code=204)
def delete_insurance(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, InsurancePolicy, entry_id, user.company_id, "Insurance policy")
    db.delete(obj)
    db.commit()


# ── Parking ───────────────────────────────────────────────────────────────────

park = APIRouter(prefix="/parking", tags=["vehicle-ops"])


@park.get("/", response_model=list[ParkingEntryRead])
def list_parking(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(ParkingEntry).filter(ParkingEntry.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(ParkingEntry.vehicle_id == vehicle_id)
    return q.all()


@park.post("/", response_model=ParkingEntryRead, status_code=201)
def create_parking(
    body: ParkingEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = ParkingEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@park.get("/{entry_id}", response_model=ParkingEntryRead)
def get_parking(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")


@park.put("/{entry_id}", response_model=ParkingEntryRead)
def update_parking(
    entry_id: int,
    body: ParkingEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@park.delete("/{entry_id}", status_code=204)
def delete_parking(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, ParkingEntry, entry_id, user.company_id, "Parking entry")
    db.delete(obj)
    db.commit()


# ── Vehicle Fixed Costs ───────────────────────────────────────────────────────

vfc = APIRouter(prefix="/vehicle-fixed-costs", tags=["vehicle-ops"])


@vfc.get("/", response_model=list[VehicleFixedCostRead])
def list_vehicle_fixed_costs(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(VehicleFixedCost).filter(VehicleFixedCost.company_id == user.company_id)
    if vehicle_id is not None:
        q = q.filter(VehicleFixedCost.vehicle_id == vehicle_id)
    return q.all()


@vfc.post("/", response_model=VehicleFixedCostRead, status_code=201)
def create_vehicle_fixed_cost(
    body: VehicleFixedCostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = VehicleFixedCost(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@vfc.get("/{entry_id}", response_model=VehicleFixedCostRead)
def get_vehicle_fixed_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")


@vfc.put("/{entry_id}", response_model=VehicleFixedCostRead)
def update_vehicle_fixed_cost(
    entry_id: int,
    body: VehicleFixedCostUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@vfc.delete("/{entry_id}", status_code=204)
def delete_vehicle_fixed_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, VehicleFixedCost, entry_id, user.company_id, "Vehicle fixed cost")
    db.delete(obj)
    db.commit()


# ── Driver Costs ──────────────────────────────────────────────────────────────

dcosts = APIRouter(prefix="/driver-costs", tags=["vehicle-ops"])


@dcosts.get("/", response_model=list[DriverCostRead])
def list_driver_costs(
    driver_id: Optional[int] = None,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    q = db.query(DriverCost).filter(DriverCost.company_id == user.company_id)
    if driver_id is not None:
        q = q.filter(DriverCost.driver_id == driver_id)
    if job_id is not None:
        q = q.filter(DriverCost.job_id == job_id)
    return q.all()


@dcosts.post("/", response_model=DriverCostRead, status_code=201)
def create_driver_cost(
    body: DriverCostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = DriverCost(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@dcosts.get("/{entry_id}", response_model=DriverCostRead)
def get_driver_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "read")),
):
    return _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")


@dcosts.put("/{entry_id}", response_model=DriverCostRead)
def update_driver_cost(
    entry_id: int,
    body: DriverCostUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@dcosts.delete("/{entry_id}", status_code=204)
def delete_driver_cost(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("vehicle-ops", "write")),
):
    obj = _get_or_404(db, DriverCost, entry_id, user.company_id, "Driver cost")
    db.delete(obj)
    db.commit()
```

- [ ] **Step 6: Register vehicle ops routers in `backend/app/main.py`**

Add these imports and `include_router` calls after the vehicles router. Full `main.py`:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _router in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 7: Run vehicle ops tests**

```bash
pytest tests/test_vehicle_ops.py -v
```

Expected: all passed.

- [ ] **Step 8: Run full suite**

```bash
pytest tests/ -v
```

Expected: all passed.

- [ ] **Step 9: Commit**

```bash
git add backend/app/schemas/vehicle.py backend/app/schemas/driver.py \
        backend/app/routers/vehicle_ops.py backend/tests/test_vehicle_ops.py \
        backend/app/main.py
git commit -m "feat(backend): vehicle-ops schemas, router (maintenance/fuel/inspections/insurance/parking/fixed-costs/driver-costs), tests"
```

---

### Task 4: Driver + Customer Schemas + Routers + Tests

**Files:**
- Extend: `backend/app/schemas/driver.py` (add Driver + DriverVehicleAssignment)
- Create: `backend/app/schemas/customer.py`
- Create: `backend/app/routers/drivers.py`
- Create: `backend/app/routers/customers.py`
- Create: `backend/tests/test_drivers.py`
- Create: `backend/tests/test_customers.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_drivers.py`:

```python
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
```

Create `backend/tests/test_customers.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_drivers.py tests/test_customers.py -v
# Expected: errors because routes don't exist
```

- [ ] **Step 3: Extend `backend/app/schemas/driver.py`**

Replace the entire file with:

```python
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DriverBase(BaseModel):
    name: str
    license: str = ""
    license_expiry: str = ""  # YYYY-MM-DD
    phone: str = ""
    status: str = "active"  # active | inactive


class DriverCreate(DriverBase):
    pass


class DriverUpdate(DriverBase):
    pass


class DriverRead(DriverBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class DriverVehicleAssignmentBase(BaseModel):
    driver_id: int
    vehicle_id: int
    start_date: str
    end_date: Optional[str] = None


class DriverVehicleAssignmentCreate(DriverVehicleAssignmentBase):
    pass


class DriverVehicleAssignmentUpdate(DriverVehicleAssignmentBase):
    pass


class DriverVehicleAssignmentRead(DriverVehicleAssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class DriverCostBase(BaseModel):
    driver_id: int
    job_id: Optional[int] = None
    date: str
    type: str  # salary | bonus | reimbursement | other
    amount: Decimal
    notes: str = ""


class DriverCostCreate(DriverCostBase):
    pass


class DriverCostUpdate(DriverCostBase):
    pass


class DriverCostRead(DriverCostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/schemas/customer.py`**

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    name: str
    contact_name: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 5: Create `backend/app/routers/drivers.py`**

```python
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.driver import Driver, DriverVehicleAssignment
from app.schemas.driver import (
    DriverCreate, DriverRead, DriverUpdate,
    DriverVehicleAssignmentCreate, DriverVehicleAssignmentRead, DriverVehicleAssignmentUpdate,
)

router = APIRouter(prefix="/drivers", tags=["drivers"])
assign_router = APIRouter(prefix="/driver-vehicle-assignments", tags=["drivers"])


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


@router.get("/", response_model=list[DriverRead])
def list_drivers(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Driver).filter(Driver.company_id == user.company_id).all()


@router.post("/", response_model=DriverRead, status_code=201)
def create_driver(
    body: DriverCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Driver(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{driver_id}", response_model=DriverRead)
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, Driver, driver_id, user.company_id, "Driver")


@router.put("/{driver_id}", response_model=DriverRead)
def update_driver(
    driver_id: int,
    body: DriverUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, Driver, driver_id, user.company_id, "Driver")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{driver_id}", status_code=204)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, Driver, driver_id, user.company_id, "Driver")
    db.delete(obj)
    db.commit()


@assign_router.get("/", response_model=list[DriverVehicleAssignmentRead])
def list_assignments(
    driver_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    q = db.query(DriverVehicleAssignment).filter(
        DriverVehicleAssignment.company_id == user.company_id
    )
    if driver_id is not None:
        q = q.filter(DriverVehicleAssignment.driver_id == driver_id)
    if vehicle_id is not None:
        q = q.filter(DriverVehicleAssignment.vehicle_id == vehicle_id)
    return q.all()


@assign_router.post("/", response_model=DriverVehicleAssignmentRead, status_code=201)
def create_assignment(
    body: DriverVehicleAssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = DriverVehicleAssignment(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@assign_router.get("/{entry_id}", response_model=DriverVehicleAssignmentRead)
def get_assignment(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")


@assign_router.put("/{entry_id}", response_model=DriverVehicleAssignmentRead)
def update_assignment(
    entry_id: int,
    body: DriverVehicleAssignmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@assign_router.delete("/{entry_id}", status_code=204)
def delete_assignment(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, DriverVehicleAssignment, entry_id, user.company_id, "Assignment")
    db.delete(obj)
    db.commit()
```

- [ ] **Step 6: Create `backend/app/routers/customers.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


def _get_or_404(db, record_id, company_id):
    obj = db.query(Customer).filter(
        Customer.id == record_id, Customer.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    return obj


@router.get("/", response_model=list[CustomerRead])
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Customer).filter(Customer.company_id == user.company_id).all()


@router.post("/", response_model=CustomerRead, status_code=201)
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Customer(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, customer_id, user.company_id)


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, customer_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, customer_id, user.company_id)
    db.delete(obj)
    db.commit()
```

- [ ] **Step 7: Add drivers and customers routers to `backend/app/main.py`**

Replace `main.py` fully:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 8: Run driver and customer tests**

```bash
pytest tests/test_drivers.py tests/test_customers.py -v
```

Expected: all passed.

- [ ] **Step 9: Run full suite**

```bash
pytest tests/ -v
```

Expected: all passed.

- [ ] **Step 10: Commit**

```bash
git add backend/app/schemas/driver.py backend/app/schemas/customer.py \
        backend/app/routers/drivers.py backend/app/routers/customers.py \
        backend/tests/test_drivers.py backend/tests/test_customers.py \
        backend/app/main.py
git commit -m "feat(backend): driver, driver-vehicle-assignment, customer schemas, routers, tests"
```

---

### Task 5: Job Schemas + Router + Tests

Job groups, jobs, and job line items all use the `operations` permission.

**Files:**
- Create: `backend/app/schemas/job.py`
- Create: `backend/app/routers/jobs.py`
- Create: `backend/tests/test_jobs.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_jobs.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_jobs.py -v
# Expected: errors because routes don't exist
```

- [ ] **Step 3: Create `backend/app/schemas/job.py`**

```python
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class JobGroupBase(BaseModel):
    name: str
    type: str = "route"  # route | one_time
    description: str = ""


class JobGroupCreate(JobGroupBase):
    pass


class JobGroupUpdate(JobGroupBase):
    pass


class JobGroupRead(JobGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class JobBase(BaseModel):
    name: str
    job_group_id: int
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    customer_id: Optional[int] = None
    revenue: Decimal = Decimal("0")
    driver_payroll: Decimal = Decimal("0")
    payments_received: Decimal = Decimal("0")
    recurrence: str = "one_time"  # daily | weekly | monthly | one_time
    start_date: str
    end_date: Optional[str] = None
    status: str = "active"  # active | completed | scheduled


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    pass


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class JobLineItemBase(BaseModel):
    job_id: int
    date: str
    category: str
    direction: str  # cost | income
    amount: Decimal
    notes: str = ""


class JobLineItemCreate(JobLineItemBase):
    pass


class JobLineItemUpdate(JobLineItemBase):
    pass


class JobLineItemRead(JobLineItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/routers/jobs.py`**

```python
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.job import JobGroup, Job, JobLineItem
from app.schemas.job import (
    JobGroupCreate, JobGroupRead, JobGroupUpdate,
    JobCreate, JobRead, JobUpdate,
    JobLineItemCreate, JobLineItemRead, JobLineItemUpdate,
)

groups_router = APIRouter(prefix="/job-groups", tags=["jobs"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])
items_router = APIRouter(prefix="/job-line-items", tags=["jobs"])


def _get_or_404(db, model, record_id, company_id, label):
    obj = db.query(model).filter(
        model.id == record_id, model.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


# ── Job Groups ────────────────────────────────────────────────────────────────

@groups_router.get("/", response_model=list[JobGroupRead])
def list_job_groups(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return db.query(JobGroup).filter(JobGroup.company_id == user.company_id).all()


@groups_router.post("/", response_model=JobGroupRead, status_code=201)
def create_job_group(
    body: JobGroupCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = JobGroup(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@groups_router.get("/{group_id}", response_model=JobGroupRead)
def get_job_group(
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")


@groups_router.put("/{group_id}", response_model=JobGroupRead)
def update_job_group(
    group_id: int,
    body: JobGroupUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@groups_router.delete("/{group_id}", status_code=204)
def delete_job_group(
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobGroup, group_id, user.company_id, "Job group")
    db.delete(obj)
    db.commit()


# ── Jobs ──────────────────────────────────────────────────────────────────────

@jobs_router.get("/", response_model=list[JobRead])
def list_jobs(
    job_group_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    q = db.query(Job).filter(Job.company_id == user.company_id)
    if job_group_id is not None:
        q = q.filter(Job.job_group_id == job_group_id)
    if vehicle_id is not None:
        q = q.filter(Job.vehicle_id == vehicle_id)
    if driver_id is not None:
        q = q.filter(Job.driver_id == driver_id)
    return q.all()


@jobs_router.post("/", response_model=JobRead, status_code=201)
def create_job(
    body: JobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = Job(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@jobs_router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, Job, job_id, user.company_id, "Job")


@jobs_router.put("/{job_id}", response_model=JobRead)
def update_job(
    job_id: int,
    body: JobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, Job, job_id, user.company_id, "Job")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@jobs_router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, Job, job_id, user.company_id, "Job")
    db.delete(obj)
    db.commit()


# ── Job Line Items ─────────────────────────────────────────────────────────────

@items_router.get("/", response_model=list[JobLineItemRead])
def list_job_line_items(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    q = db.query(JobLineItem).filter(JobLineItem.company_id == user.company_id)
    if job_id is not None:
        q = q.filter(JobLineItem.job_id == job_id)
    return q.all()


@items_router.post("/", response_model=JobLineItemRead, status_code=201)
def create_job_line_item(
    body: JobLineItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = JobLineItem(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@items_router.get("/{item_id}", response_model=JobLineItemRead)
def get_job_line_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "read")),
):
    return _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")


@items_router.put("/{item_id}", response_model=JobLineItemRead)
def update_job_line_item(
    item_id: int,
    body: JobLineItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@items_router.delete("/{item_id}", status_code=204)
def delete_job_line_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("operations", "write")),
):
    obj = _get_or_404(db, JobLineItem, item_id, user.company_id, "Job line item")
    db.delete(obj)
    db.commit()
```

- [ ] **Step 5: Add jobs routers to `backend/app/main.py`**

Replace `main.py` fully:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 6: Run job tests**

```bash
pytest tests/test_jobs.py -v
```

Expected: all passed.

- [ ] **Step 7: Run full suite**

```bash
pytest tests/ -v
```

Expected: all passed.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/job.py backend/app/routers/jobs.py \
        backend/tests/test_jobs.py backend/app/main.py
git commit -m "feat(backend): job-group, job, job-line-item schemas, router, tests"
```

---

### Task 6: G&A Schema + Router + Tests

**Files:**
- Create: `backend/app/schemas/ga.py`
- Create: `backend/app/routers/ga.py`
- Create: `backend/tests/test_ga.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_ga.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_ga.py -v
# Expected: errors
```

- [ ] **Step 3: Create `backend/app/schemas/ga.py`**

```python
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class GaEntryBase(BaseModel):
    category: str
    date: str  # YYYY-MM-DD
    amount: Decimal
    notes: str = ""


class GaEntryCreate(GaEntryBase):
    pass


class GaEntryUpdate(GaEntryBase):
    pass


class GaEntryRead(GaEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/routers/ga.py`**

```python
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.ga import GaEntry
from app.schemas.ga import GaEntryCreate, GaEntryRead, GaEntryUpdate

router = APIRouter(prefix="/ga-entries", tags=["ga"])


def _get_or_404(db, record_id, company_id):
    obj = db.query(GaEntry).filter(
        GaEntry.id == record_id, GaEntry.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="G&A entry not found")
    return obj


@router.get("/", response_model=list[GaEntryRead])
def list_ga_entries(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "read")),
):
    q = db.query(GaEntry).filter(GaEntry.company_id == user.company_id)
    if category is not None:
        q = q.filter(GaEntry.category == category)
    return q.all()


@router.post("/", response_model=GaEntryRead, status_code=201)
def create_ga_entry(
    body: GaEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = GaEntry(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{entry_id}", response_model=GaEntryRead)
def get_ga_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "read")),
):
    return _get_or_404(db, entry_id, user.company_id)


@router.put("/{entry_id}", response_model=GaEntryRead)
def update_ga_entry(
    entry_id: int,
    body: GaEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = _get_or_404(db, entry_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{entry_id}", status_code=204)
def delete_ga_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ga-expenses", "write")),
):
    obj = _get_or_404(db, entry_id, user.company_id)
    db.delete(obj)
    db.commit()
```

- [ ] **Step 5: Add G&A router to `backend/app/main.py`**

Replace `main.py` fully:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 6: Run G&A tests**

```bash
pytest tests/test_ga.py -v
```

Expected: all passed.

- [ ] **Step 7: Run full suite**

```bash
pytest tests/ -v
```

Expected: all passed.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/ga.py backend/app/routers/ga.py \
        backend/tests/test_ga.py backend/app/main.py
git commit -m "feat(backend): G&A entry schema, router, tests"
```

---

### Task 7: Users + Roles Schemas + Router + Tests

Users and roles are admin-only (permission resource: `users`). These endpoints allow an admin to invite new users (by providing a pre-registered Firebase UID) and manage role assignments.

**Files:**
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/routers/users.py`
- Create: `backend/tests/test_users.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_users.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_users.py -v
# Expected: errors because routes don't exist
```

- [ ] **Step 3: Create `backend/app/schemas/user.py`**

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    name: str
    description: str = ""


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class RoleRead(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    firebase_uid: str
    email: str
    name: str = ""
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    pass


class UserUpdate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Create `backend/app/routers/users.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User, Role
from app.schemas.user import (
    RoleCreate, RoleRead, RoleUpdate,
    UserCreate, UserRead, UserUpdate,
)

roles_router = APIRouter(prefix="/roles", tags=["users"])
users_router = APIRouter(prefix="/users", tags=["users"])


def _get_role_or_404(db, role_id, company_id):
    obj = db.query(Role).filter(
        Role.id == role_id, Role.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Role not found")
    return obj


def _get_user_or_404(db, user_id, company_id):
    obj = db.query(User).filter(
        User.id == user_id, User.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="User not found")
    return obj


# ── Roles ─────────────────────────────────────────────────────────────────────

@roles_router.get("/", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "read")),
):
    return db.query(Role).filter(Role.company_id == user.company_id).all()


@roles_router.post("/", response_model=RoleRead, status_code=201)
def create_role(
    body: RoleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = Role(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@roles_router.get("/{role_id}", response_model=RoleRead)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "read")),
):
    return _get_role_or_404(db, role_id, user.company_id)


@roles_router.put("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = _get_role_or_404(db, role_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@roles_router.delete("/{role_id}", status_code=204)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = _get_role_or_404(db, role_id, user.company_id)
    db.delete(obj)
    db.commit()


# ── Users ─────────────────────────────────────────────────────────────────────

@users_router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return db.query(User).filter(User.company_id == current_user.company_id).all()


@users_router.post("/", response_model=UserRead, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = User(company_id=current_user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return _get_user_or_404(db, user_id, current_user.company_id)


@users_router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    db.delete(obj)
    db.commit()
```

- [ ] **Step 5: Add users routers to `backend/app/main.py`** (leave stub in place for now)

Replace `main.py` fully:

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router
from app.routers import users as users_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")
app.include_router(users_router.roles_router, prefix="/api/v1")
app.include_router(users_router.users_router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 6: Run users tests**

```bash
pytest tests/test_users.py -v
```

Expected: all passed.

- [ ] **Step 7: Run full suite**

```bash
pytest tests/ -v
```

Expected: all passed.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/user.py backend/app/routers/users.py \
        backend/tests/test_users.py backend/app/main.py
git commit -m "feat(backend): user and role schemas, router (admin-only), tests"
```

---

### Task 8: Wire Final main.py + Remove Stubs + Full Suite

**Files:**
- Modify: `backend/app/main.py` (remove stub, finalize)

- [ ] **Step 1: Write the stub-removal test**

Add to `backend/tests/test_auth.py` (append, don't replace existing tests):

```python
def test_reports_pl_stub_removed_and_protected(client, db):
    """Ensures /api/v1/reports/pl still requires auth (stub was replaced, not deleted)."""
    response = client.get("/api/v1/reports/pl")
    assert response.status_code == 401
```

- [ ] **Step 2: Run the test — expect pass (stub still exists)**

```bash
pytest tests/test_auth.py::test_reports_pl_stub_removed_and_protected -v
# Expected: PASS (stub still returns {} when authenticated; 401 when not)
```

- [ ] **Step 3: Remove the stub from `backend/app/main.py`**

Replace `main.py` with the final version (stub route removed):

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router
from app.routers import users as users_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")
app.include_router(users_router.roles_router, prefix="/api/v1")
app.include_router(users_router.users_router, prefix="/api/v1")
```

- [ ] **Step 4: Run the stub test — verify it still passes (route gone = 404 or still 401?)**

The `test_reports_pl_stub_removed_and_protected` test asserts `status_code == 401`. After removing the stub, `/api/v1/reports/pl` no longer exists, so it returns 404. Update that test to reflect reality:

In `backend/tests/test_auth.py`, change:
```python
def test_reports_pl_stub_removed_and_protected(client, db):
    """Ensures /api/v1/reports/pl no longer exists as a stub (plan 2 complete)."""
    response = client.get("/api/v1/reports/pl")
    assert response.status_code in (404, 401)
```

- [ ] **Step 5: Run full test suite**

```bash
cd backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
pytest tests/ -v
```

Expected: all tests pass. Count should be:
- test_health.py: 1
- test_auth.py: 5
- test_vehicles.py: 6
- test_vehicle_ops.py: ~10
- test_drivers.py: 7
- test_customers.py: 6
- test_jobs.py: ~12
- test_ga.py: 7
- test_users.py: 8

Total: ~62 tests, all passing.

- [ ] **Step 6: Verify API docs load**

```bash
# Start the server (docker compose should still have db running)
cd backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
export FIREBASE_PROJECT_ID=test-project
export FIREBASE_CREDENTIALS_PATH=""
uvicorn app.main:app --reload --port 8080
```

Open `http://localhost:8080/docs` — all 17 endpoint groups should appear in the Swagger UI.

- [ ] **Step 7: Commit**

```bash
git add backend/app/main.py backend/tests/test_auth.py
git commit -m "feat(backend): wire all routers, remove stub routes — CRUD API layer complete"
```

---

## Self-Review

**Spec coverage:**

All 17 resource groups from the design spec are covered:
- `/api/v1/vehicles` ✅ Task 2
- `/api/v1/maintenance`, `/fuel`, `/inspections`, `/insurance`, `/parking`, `/vehicle-fixed-costs`, `/driver-costs` ✅ Task 3
- `/api/v1/drivers`, `/driver-vehicle-assignments` ✅ Task 4
- `/api/v1/customers` ✅ Task 4
- `/api/v1/job-groups`, `/jobs`, `/job-line-items` ✅ Task 5
- `/api/v1/ga-entries` ✅ Task 6
- `/api/v1/users`, `/roles` ✅ Task 7

Plan 3 endpoints (`/dashboard`, `/profitability`, `/reports/*`) are not in scope.

**Placeholder scan:** None found.

**Type consistency:**
- `_get_or_404` helper defined locally in each router file — named consistently.
- `body.model_dump()` used consistently for all create/update operations.
- `Decimal` used for all monetary fields across all schemas.
- `passed` / `pass_` mapping handled consistently in `InspectionCreate`/`InspectionUpdate` (pop + rename) and `InspectionRead` (`validation_alias="pass_"`).
