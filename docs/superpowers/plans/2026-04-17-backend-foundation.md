# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working FastAPI + PostgreSQL backend with Firebase auth, RBAC, all 17 database tables, and seed data loaded from the frontend.

**Architecture:** FastAPI app in `backend/` alongside the existing `frontend/`. SQLAlchemy 2.0 ORM with psycopg2. Firebase Admin SDK verifies ID tokens; a `require_permission(resource, action)` dependency enforces RBAC per route. All entity tables carry `company_id` for future multi-tenancy.

**Tech Stack:** Python 3.11, FastAPI 0.110, SQLAlchemy 2.0, Alembic 1.13, psycopg2-binary, firebase-admin 6.4, pydantic-settings 2.2, pytest 8, httpx 0.27

---

## File Map

```
backend/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial.py
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py
│   └── models/
│       ├── __init__.py
│       ├── base.py
│       ├── company.py
│       ├── user.py
│       ├── vehicle.py
│       ├── driver.py
│       ├── customer.py
│       ├── job.py
│       └── ga.py
├── seed/
│   ├── __init__.py
│   └── seed.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_health.py
    └── test_auth.py
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `backend/docker-compose.yml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.27
psycopg2-binary==2.9.9
alembic==1.13.1
firebase-admin==6.4.0
pydantic==2.6.1
pydantic-settings==2.2.1
python-dotenv==1.0.1
pytest==8.0.0
httpx==0.27.0
pytest-mock==3.12.0
```

- [ ] **Step 2: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 3: Create `backend/docker-compose.yml`**

```yaml
version: "3.9"

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: evabus
      POSTGRES_USER: evabus
      POSTGRES_PASSWORD: evabus
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://evabus:evabus@db:5432/evabus
      FIREBASE_PROJECT_ID: your-firebase-project-id
      FIREBASE_CREDENTIALS_PATH: ""
    depends_on:
      - db
    volumes:
      - .:/app

volumes:
  pgdata:
```

- [ ] **Step 4: Create `backend/.env.example`**

```
DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
```

- [ ] **Step 5: Create `backend/app/__init__.py`** (empty file)

- [ ] **Step 6: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    firebase_project_id: str
    firebase_credentials_path: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 7: Create `backend/app/database.py`**

```python
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 8: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to Firebase Hosting URL before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Verify the app starts**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Open http://localhost:8000/health → should return {"status": "ok"}
```

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): project scaffold with FastAPI, config, database, docker"
```

---

### Task 2: SQLAlchemy Base + Company + RBAC Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/company.py`
- Create: `backend/app/models/user.py`

- [ ] **Step 1: Create `backend/app/models/__init__.py`**

```python
from app.models.base import Base
from app.models.company import Company
from app.models.user import Permission, RolePermission, Role, User
from app.models.vehicle import (
    Vehicle, VehicleFixedCost, InsurancePolicy,
    ParkingEntry, MaintenanceEntry, FuelEntry, Inspection,
)
from app.models.driver import Driver, DriverVehicleAssignment, DriverCost
from app.models.customer import Customer
from app.models.job import JobGroup, Job, JobLineItem
from app.models.ga import GaEntry

__all__ = [
    "Base", "Company",
    "Permission", "RolePermission", "Role", "User",
    "Vehicle", "VehicleFixedCost", "InsurancePolicy",
    "ParkingEntry", "MaintenanceEntry", "FuelEntry", "Inspection",
    "Driver", "DriverVehicleAssignment", "DriverCost",
    "Customer",
    "JobGroup", "Job", "JobLineItem",
    "GaEntry",
]
```

- [ ] **Step 2: Create `backend/app/models/base.py`**

```python
from datetime import datetime
from sqlalchemy import DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class EntityMixin(TimestampMixin):
    """Adds id + company_id + timestamps to every entity table."""
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
```

- [ ] **Step 3: Create `backend/app/models/company.py`**

```python
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 4: Create `backend/app/models/user.py`**

```python
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("resource", "action", name="uq_permission"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # 'read' | 'write'

    role_permissions: Mapped[list["RolePermission"]] = relationship(
        back_populates="permission", cascade="all, delete-orphan"
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )

    role: Mapped["Role"] = relationship(back_populates="role_permissions")
    permission: Mapped[Permission] = relationship(back_populates="role_permissions")


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")

    users: Mapped[list["User"]] = relationship(back_populates="role")
    role_permissions: Mapped[list[RolePermission]] = relationship(
        back_populates="role", cascade="all, delete-orphan"
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    firebase_uid: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    role: Mapped[Role] = relationship(back_populates="users")
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/
git commit -m "feat(backend): SQLAlchemy base, company, and RBAC models"
```

---

### Task 3: Vehicle Models

**Files:**
- Create: `backend/app/models/vehicle.py`

- [ ] **Step 1: Create `backend/app/models/vehicle.py`**

```python
from sqlalchemy import String, Integer, Boolean, Numeric, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class Vehicle(Base, EntityMixin):
    __tablename__ = "vehicles"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    vin: Mapped[str] = mapped_column(String(17), default="")
    license_plate: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active | maintenance | out_of_service
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(50), default="")


class VehicleFixedCost(Base, EntityMixin):
    __tablename__ = "vehicle_fixed_costs"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # loan | eld | management_fee
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    notes: Mapped[str] = mapped_column(Text, default="")


class InsurancePolicy(Base, EntityMixin):
    __tablename__ = "insurance_policies"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(200), default="")
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # monthly | yearly
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")


class ParkingEntry(Base, EntityMixin):
    __tablename__ = "parking_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # monthly | one_time
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    location: Mapped[str] = mapped_column(String(255), default="")
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, default="")


class MaintenanceEntry(Base, EntityMixin):
    __tablename__ = "maintenance_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tech: Mapped[str] = mapped_column(String(100), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class FuelEntry(Base, EntityMixin):
    __tablename__ = "fuel_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    gallons: Mapped[float] = mapped_column(Numeric(8, 3), nullable=False)
    cpg: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    odometer: Mapped[int] = mapped_column(Integer, default=0)
    full: Mapped[bool] = mapped_column(Boolean, default=False)


class Inspection(Base, EntityMixin):
    __tablename__ = "inspections"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    driver_name: Mapped[str] = mapped_column(String(200), default="")
    results: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    pass_: Mapped[bool] = mapped_column("pass", Boolean, nullable=False, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/vehicle.py
git commit -m "feat(backend): vehicle, fixed cost, insurance, parking, maintenance, fuel, inspection models"
```

---

### Task 4: Driver and Customer Models

**Files:**
- Create: `backend/app/models/driver.py`
- Create: `backend/app/models/customer.py`

- [ ] **Step 1: Create `backend/app/models/driver.py`**

```python
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class Driver(Base, EntityMixin):
    __tablename__ = "drivers"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    license: Mapped[str] = mapped_column(String(50), default="")
    license_expiry: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    phone: Mapped[str] = mapped_column(String(30), default="")
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="active")  # active | inactive


class DriverVehicleAssignment(Base, EntityMixin):
    __tablename__ = "driver_vehicle_assignments"

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)


class DriverCost(Base, EntityMixin):
    __tablename__ = "driver_costs"

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # salary | bonus | reimbursement | other
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 2: Create `backend/app/models/customer.py`**

```python
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class Customer(Base, EntityMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/driver.py backend/app/models/customer.py
git commit -m "feat(backend): driver, driver assignment, driver cost, customer models"
```

---

### Task 5: Job and G&A Models

**Files:**
- Create: `backend/app/models/job.py`
- Create: `backend/app/models/ga.py`

- [ ] **Step 1: Create `backend/app/models/job.py`**

```python
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class JobGroup(Base, EntityMixin):
    __tablename__ = "job_groups"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False, default="route")  # route | one_time
    description: Mapped[str] = mapped_column(Text, default="")


class Job(Base, EntityMixin):
    __tablename__ = "jobs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_group_id: Mapped[int] = mapped_column(
        ForeignKey("job_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    revenue: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    driver_payroll: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payments_received: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    recurrence: Mapped[str] = mapped_column(String(20), default="one_time")
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="active")  # active | completed | scheduled


class JobLineItem(Base, EntityMixin):
    __tablename__ = "job_line_items"

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    direction: Mapped[str] = mapped_column(String(6), nullable=False)  # cost | income
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 2: Create `backend/app/models/ga.py`**

```python
from sqlalchemy import String, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class GaEntry(Base, EntityMixin):
    __tablename__ = "ga_entries"

    category: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/job.py backend/app/models/ga.py
git commit -m "feat(backend): job group, job, job line item, G&A entry models"
```

---

### Task 6: Alembic Setup + Initial Migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`

- [ ] **Step 1: Create `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
file_template = %%(rev)s_%%(slug)s
prepend_sys_path = .
sqlalchemy.url =

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create `backend/alembic/env.py`**

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all models so Alembic sees them
from app.models import Base  # noqa: F401

target_metadata = Base.metadata

# Read DATABASE_URL from environment (overrides alembic.ini)
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create `backend/alembic/__init__.py`** (empty file)

- [ ] **Step 4: Start Postgres and generate the initial migration**

```bash
cd backend
docker compose up db -d
# Wait 3 seconds for Postgres to be ready
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
alembic revision --autogenerate -m "initial"
# This creates backend/alembic/versions/<hash>_initial.py
```

- [ ] **Step 5: Review the generated migration**

Open the generated file in `alembic/versions/`. Verify it contains `CREATE TABLE` statements for all 17 tables: `companies`, `permissions`, `roles`, `role_permissions`, `users`, `vehicles`, `vehicle_fixed_costs`, `insurance_policies`, `parking_entries`, `maintenance_entries`, `fuel_entries`, `inspections`, `drivers`, `driver_vehicle_assignments`, `driver_costs`, `customers`, `job_groups`, `jobs`, `job_line_items`, `ga_entries`.

If any table is missing, ensure its model file is imported in `app/models/__init__.py`.

- [ ] **Step 6: Apply the migration**

```bash
alembic upgrade head
# Expected output ends with: Running upgrade  -> <rev>, initial
```

- [ ] **Step 7: Verify tables exist**

```bash
psql postgresql://evabus:evabus@localhost:5432/evabus -c "\dt"
# Should list all 20 tables (17 entity + alembic_version)
```

- [ ] **Step 8: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat(backend): Alembic setup and initial migration for all 17 tables"
```

---

### Task 7: Test Infrastructure + Health Check Test

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Create `backend/tests/__init__.py`** (empty file)

- [ ] **Step 2: Create `backend/tests/conftest.py`**

```python
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
```

- [ ] **Step 3: Create `backend/tests/test_health.py`**

```python
def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 4: Create test database and run the test**

```bash
cd backend
# Create the test database
psql postgresql://evabus:evabus@localhost:5432/postgres -c "CREATE DATABASE evabus_test;"

export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus_test
export FIREBASE_PROJECT_ID=test-project
pytest tests/test_health.py -v
```

Expected output:
```
tests/test_health.py::test_health_returns_ok PASSED
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests/
git commit -m "feat(backend): test infrastructure with transactional fixtures + health check test"
```

---

### Task 8: Firebase Auth Middleware

**Files:**
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/middleware/auth.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing auth test**

Create `backend/tests/test_auth.py`:

```python
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
    assert response.status_code in (401, 403, 422)


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
```

- [ ] **Step 2: Run test — expect failure (route doesn't exist yet)**

```bash
pytest tests/test_auth.py -v
# Expected: errors/failures because /api/v1/vehicles doesn't exist yet
```

- [ ] **Step 3: Create `backend/app/middleware/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/app/middleware/auth.py`**

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.models.user import User, Permission, RolePermission

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = (
        db.query(User)
        .filter(User.firebase_uid == decoded["uid"], User.is_active == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def require_permission(resource: str, action: str):
    """
    FastAPI dependency factory. Usage:
        @router.get("/", dependencies=[Depends(require_permission("master-data", "read"))])
    """
    def checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        perms = (
            db.query(Permission)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .filter(RolePermission.role_id == user.role_id)
            .all()
        )
        granted = {(p.resource, p.action) for p in perms}

        # 'write' permission implies 'read'
        if action == "read":
            has_perm = (resource, "read") in granted or (resource, "write") in granted
        else:
            has_perm = (resource, action) in granted

        if not has_perm:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        return user

    return checker
```

- [ ] **Step 5: Initialize Firebase in `backend/app/main.py` and add a stub vehicles route**

```python
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission

# Initialize Firebase Admin SDK once at startup
if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        # In tests / local dev without credentials, initialize with project ID only
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Stub route used by auth tests — will be replaced in Plan 2
@app.get("/api/v1/vehicles", dependencies=[Depends(require_permission("master-data", "read"))])
def list_vehicles_stub():
    return []


# Stub route used by auth tests — will be replaced in Plan 2
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
```

- [ ] **Step 6: Run the auth tests**

```bash
pytest tests/test_auth.py -v
```

Expected output:
```
tests/test_auth.py::test_missing_token_returns_403 PASSED
tests/test_auth.py::test_invalid_token_returns_401 PASSED
tests/test_auth.py::test_valid_token_with_permission_passes PASSED
tests/test_auth.py::test_valid_token_without_permission_returns_403 PASSED
```

- [ ] **Step 7: Run full test suite**

```bash
pytest tests/ -v
# All tests should pass
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/middleware/ backend/app/main.py backend/tests/test_auth.py
git commit -m "feat(backend): Firebase auth middleware with RBAC permission checking"
```

---

### Task 9: Seed Script

**Files:**
- Create: `backend/seed/__init__.py`
- Create: `backend/seed/seed.py`

The seed script loads all frontend static data into the database. It is idempotent — safe to run multiple times (it checks for existing records before inserting).

- [ ] **Step 1: Create `backend/seed/__init__.py`** (empty file)

- [ ] **Step 2: Create `backend/seed/seed.py`**

```python
"""
Seed script: loads all EvaBus frontend static data into the database.
Idempotent — skips records that already exist.

Usage:
    export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
    python -m seed.seed
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


def seed():
    from app.models import (
        Base, Company, Permission, Role, RolePermission, User,
        Vehicle, VehicleFixedCost, InsurancePolicy, ParkingEntry,
        MaintenanceEntry, FuelEntry, Inspection,
        Driver, DriverVehicleAssignment, DriverCost,
        Customer, JobGroup, Job, JobLineItem, GaEntry,
    )

    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        # ── Company ───────────────────────────────────────────
        company = db.query(Company).first()
        if not company:
            company = Company(name="EvaBus LLC")
            db.add(company)
            db.flush()
            print(f"Created company: {company.name} (id={company.id})")
        else:
            print(f"Company already exists (id={company.id})")

        cid = company.id

        # ── RBAC: Permissions ─────────────────────────────────
        PERMISSIONS = [
            ("operations",   "read"),
            ("operations",   "write"),
            ("master-data",  "read"),
            ("master-data",  "write"),
            ("vehicle-ops",  "read"),
            ("vehicle-ops",  "write"),
            ("ga-expenses",  "read"),
            ("ga-expenses",  "write"),
            ("profit-center","read"),
            ("profit-center","write"),
            ("reports",      "read"),
            ("reports",      "write"),
            ("users",        "read"),
            ("users",        "write"),
        ]

        perm_map: dict[tuple, Permission] = {}
        for resource, action in PERMISSIONS:
            p = db.query(Permission).filter_by(resource=resource, action=action).first()
            if not p:
                p = Permission(resource=resource, action=action)
                db.add(p)
                db.flush()
            perm_map[(resource, action)] = p

        # ── RBAC: Roles + their permissions ───────────────────
        ROLE_PERMS = {
            "admin": list(perm_map.values()),  # all permissions
            "investor": [
                perm_map[("operations",    "read")],
                perm_map[("master-data",   "read")],
                perm_map[("vehicle-ops",   "read")],
                perm_map[("ga-expenses",   "read")],
                perm_map[("profit-center", "read")],
                perm_map[("reports",       "read")],
            ],
            "manager": [
                perm_map[("operations",    "read")],
                perm_map[("operations",    "write")],
                perm_map[("master-data",   "read")],
                perm_map[("master-data",   "write")],
                perm_map[("vehicle-ops",   "read")],
                perm_map[("vehicle-ops",   "write")],
                perm_map[("ga-expenses",   "read")],
                perm_map[("ga-expenses",   "write")],
                perm_map[("profit-center", "read")],
                perm_map[("profit-center", "write")],
                perm_map[("reports",       "read")],
                perm_map[("reports",       "write")],
            ],
            "staff": [
                perm_map[("operations",   "read")],
                perm_map[("operations",   "write")],
                perm_map[("master-data",  "read")],
                perm_map[("master-data",  "write")],
                perm_map[("vehicle-ops",  "read")],
                perm_map[("vehicle-ops",  "write")],
                perm_map[("ga-expenses",  "read")],
                perm_map[("ga-expenses",  "write")],
            ],
        }

        role_map: dict[str, Role] = {}
        for role_name, perms in ROLE_PERMS.items():
            role = db.query(Role).filter_by(company_id=cid, name=role_name).first()
            if not role:
                role = Role(company_id=cid, name=role_name)
                db.add(role)
                db.flush()
                for perm in perms:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                print(f"Created role: {role_name}")
            role_map[role_name] = role

        # ── Customers ─────────────────────────────────────────
        CUSTOMERS = [
            dict(name="Metro Transit Authority", contact_name="James Wilson",    email="jwilson@metro.gov",    phone="212-555-0101"),
            dict(name="Greenway School District",contact_name="Patricia Chen",   email="pchen@greenway.edu",   phone="718-555-0102"),
            dict(name="Harbor Cruise Lines",     contact_name="Robert Martinez", email="rmartinez@harbor.com", phone="646-555-0103"),
            dict(name="City Airport Shuttle",    contact_name="Linda Thompson",  email="lthompson@shuttle.com",phone="917-555-0104"),
            dict(name="Corporate Express Inc",   contact_name="Michael Brown",   email="mbrown@corpexp.com",   phone="212-555-0105"),
        ]
        cust_ids: list[int] = []
        for c in CUSTOMERS:
            obj = db.query(Customer).filter_by(company_id=cid, name=c["name"]).first()
            if not obj:
                obj = Customer(company_id=cid, **c, notes="")
                db.add(obj)
                db.flush()
            cust_ids.append(obj.id)

        # ── Vehicles ──────────────────────────────────────────
        VEHICLES = [
            dict(year=2019, make="Blue Bird",   model="Vision",   license_plate="ABC-1234", vin="1BAKBCPA5KF123456", status="active",       mileage=145230, color="Yellow"),
            dict(year=2020, make="IC Bus",      model="CE Series",license_plate="DEF-5678", vin="4DRBUAAN5LB234567", status="active",       mileage=98450,  color="White"),
            dict(year=2018, make="Thomas Built",model="Saf-T-Liner",license_plate="GHI-9012",vin="4UZABRFE5JCAA3456",status="maintenance",  mileage=210870, color="Yellow"),
            dict(year=2021, make="Blue Bird",   model="All American",license_plate="JKL-3456",vin="1BAKBCPA6MF456789",status="active",      mileage=67890,  color="Yellow"),
            dict(year=2017, make="IC Bus",      model="RE Series",license_plate="MNO-7890", vin="4DRBUABN3HB567890", status="out_of_service",mileage=287650, color="White"),
            dict(year=2022, make="Thomas Built",model="Jouley",   license_plate="PQR-1234", vin="4UZABRFE6NCAB6789", status="active",       mileage=34210,  color="White"),
            dict(year=2020, make="Blue Bird",   model="Micro Bird",license_plate="STU-5678", vin="1BAKBCPA7KF789012",status="active",       mileage=78930,  color="Yellow"),
            dict(year=2019, make="IC Bus",      model="CE Series",license_plate="VWX-9012", vin="4DRBUAAN6KB890123", status="active",       mileage=156780, color="White"),
            dict(year=2021, make="Thomas Built",model="Saf-T-Liner",license_plate="YZA-3456",vin="4UZABRFE7MCAB9012",status="active",       mileage=45670,  color="Yellow"),
            dict(year=2018, make="Blue Bird",   model="Vision",   license_plate="BCD-7890", vin="1BAKBCPA8JF901234", status="active",       mileage=198340, color="Yellow"),
        ]
        vehicle_ids: list[int] = []
        for v in VEHICLES:
            obj = db.query(Vehicle).filter_by(company_id=cid, license_plate=v["license_plate"]).first()
            if not obj:
                obj = Vehicle(company_id=cid, **v)
                db.add(obj)
                db.flush()
            vehicle_ids.append(obj.id)

        # ── Drivers ───────────────────────────────────────────
        DRIVERS = [
            dict(name="Michael Johnson", license="CDL-789012", license_expiry="2025-08-15", phone="212-555-0201", status="active"),
            dict(name="Sarah Williams",  license="CDL-456789", license_expiry="2026-03-22", phone="718-555-0202", status="active"),
            dict(name="Robert Davis",    license="CDL-123456", license_expiry="2024-11-30", phone="646-555-0203", status="active"),
            dict(name="Emily Chen",      license="CDL-321654", license_expiry="2026-07-18", phone="917-555-0204", status="active"),
            dict(name="James Wilson",    license="CDL-654321", license_expiry="2025-02-28", phone="212-555-0205", status="inactive"),
            dict(name="Maria Garcia",    license="CDL-987654", license_expiry="2026-11-05", phone="718-555-0206", status="active"),
            dict(name="David Martinez",  license="CDL-147258", license_expiry="2025-09-12", phone="646-555-0207", status="active"),
            dict(name="Lisa Anderson",   license="CDL-258369", license_expiry="2026-01-25", phone="917-555-0208", status="active"),
        ]
        driver_ids: list[int] = []
        for d in DRIVERS:
            obj = db.query(Driver).filter_by(company_id=cid, name=d["name"]).first()
            if not obj:
                obj = Driver(company_id=cid, **d)
                db.add(obj)
                db.flush()
            driver_ids.append(obj.id)

        # ── Job Groups ────────────────────────────────────────
        JOB_GROUPS = [
            dict(name="School District Routes",  type="route",    description="Regular school bus routes for Greenway School District"),
            dict(name="Airport Shuttle Service", type="route",    description="Daily airport shuttle service contracts"),
            dict(name="Charter & Special Events",type="one_time", description="One-time charter bookings and special events"),
            dict(name="Corporate Contracts",     type="route",    description="Regular corporate shuttle services"),
            dict(name="City Transit Support",    type="route",    description="Metro Transit Authority support routes"),
        ]
        jg_ids: list[int] = []
        for jg in JOB_GROUPS:
            obj = db.query(JobGroup).filter_by(company_id=cid, name=jg["name"]).first()
            if not obj:
                obj = JobGroup(company_id=cid, **jg)
                db.add(obj)
                db.flush()
            jg_ids.append(obj.id)

        # ── Vehicle Fixed Costs ───────────────────────────────
        # 3 per vehicle: loan, eld, management_fee
        FIXED_COST_TEMPLATES = [
            dict(type="loan",           costs=[1200, 1450, 800, 1350, 950, 1100, 1050, 1250, 1300, 1150]),
            dict(type="eld",            costs=[40,   45,   35,  42,   38,  44,   41,   43,   39,   40  ]),
            dict(type="management_fee", costs=[150,  150,  150, 150,  150, 150,  150,  150,  150,  150 ]),
        ]
        for template in FIXED_COST_TEMPLATES:
            for i, vid in enumerate(vehicle_ids):
                exists = db.query(VehicleFixedCost).filter_by(
                    company_id=cid, vehicle_id=vid, type=template["type"]
                ).first()
                if not exists:
                    db.add(VehicleFixedCost(
                        company_id=cid, vehicle_id=vid,
                        type=template["type"],
                        cost=template["costs"][i],
                        start_date="2024-01-01", notes="",
                    ))

        # ── Jobs ──────────────────────────────────────────────
        JOBS = [
            dict(name="Route 1 - Elementary",    job_group_id=jg_ids[0], vehicle_id=vehicle_ids[0], driver_id=driver_ids[0], customer_id=cust_ids[1], revenue=8500,  driver_payroll=3200, payments_received=8500,  recurrence="daily",   start_date="2024-09-01", end_date="2025-06-30", status="active"),
            dict(name="Route 2 - High School",   job_group_id=jg_ids[0], vehicle_id=vehicle_ids[1], driver_id=driver_ids[1], customer_id=cust_ids[1], revenue=7800,  driver_payroll=2900, payments_received=7800,  recurrence="daily",   start_date="2024-09-01", end_date="2025-06-30", status="active"),
            dict(name="JFK Morning Shuttle",      job_group_id=jg_ids[1], vehicle_id=vehicle_ids[3], driver_id=driver_ids[3], customer_id=cust_ids[3], revenue=12000, driver_payroll=4200, payments_received=12000, recurrence="daily",   start_date="2024-01-01", end_date=None,         status="active"),
            dict(name="LGA Evening Shuttle",      job_group_id=jg_ids[1], vehicle_id=vehicle_ids[6], driver_id=driver_ids[6], customer_id=cust_ids[3], revenue=9500,  driver_payroll=3500, payments_received=9500,  recurrence="daily",   start_date="2024-01-01", end_date=None,         status="active"),
            dict(name="Wedding Charter - June",   job_group_id=jg_ids[2], vehicle_id=vehicle_ids[5], driver_id=driver_ids[5], customer_id=cust_ids[2], revenue=3500,  driver_payroll=600,  payments_received=3500,  recurrence="one_time",start_date="2025-06-14", end_date="2025-06-14", status="completed"),
            dict(name="Corporate HQ Shuttle",     job_group_id=jg_ids[3], vehicle_id=vehicle_ids[7], driver_id=driver_ids[7], customer_id=cust_ids[4], revenue=11000, driver_payroll=3800, payments_received=11000, recurrence="daily",   start_date="2024-03-01", end_date=None,         status="active"),
            dict(name="Route 15 - Downtown",      job_group_id=jg_ids[4], vehicle_id=vehicle_ids[8], driver_id=driver_ids[2], customer_id=cust_ids[0], revenue=15000, driver_payroll=5200, payments_received=15000, recurrence="daily",   start_date="2024-06-01", end_date=None,         status="active"),
            dict(name="Route 22 - Crosstown",     job_group_id=jg_ids[4], vehicle_id=vehicle_ids[9], driver_id=driver_ids[4], customer_id=cust_ids[0], revenue=13500, driver_payroll=4700, payments_received=13500, recurrence="daily",   start_date="2024-06-01", end_date=None,         status="active"),
        ]
        job_ids: list[int] = []
        for j in JOBS:
            obj = db.query(Job).filter_by(company_id=cid, name=j["name"]).first()
            if not obj:
                obj = Job(company_id=cid, **j)
                db.add(obj)
                db.flush()
            job_ids.append(obj.id)

        # ── G&A Entries (2025 + 2026) ─────────────────────────
        GA_ENTRIES = [
            # 2025 entries (sample — one per month per major category)
            dict(category="Office Rent",      date="2025-01-01", amount=2500),
            dict(category="Office Rent",      date="2025-02-01", amount=2500),
            dict(category="Office Rent",      date="2025-03-01", amount=2500),
            dict(category="Office Rent",      date="2025-04-01", amount=2500),
            dict(category="Office Rent",      date="2025-05-01", amount=2500),
            dict(category="Office Rent",      date="2025-06-01", amount=2500),
            dict(category="Office Rent",      date="2025-07-01", amount=2500),
            dict(category="Office Rent",      date="2025-08-01", amount=2500),
            dict(category="Office Rent",      date="2025-09-01", amount=2500),
            dict(category="Office Rent",      date="2025-10-01", amount=2500),
            dict(category="Office Rent",      date="2025-11-01", amount=2500),
            dict(category="Office Rent",      date="2025-12-01", amount=2500),
            dict(category="Salaries",         date="2025-01-15", amount=8000),
            dict(category="Salaries",         date="2025-02-15", amount=8000),
            dict(category="Salaries",         date="2025-03-15", amount=8000),
            dict(category="Salaries",         date="2025-04-15", amount=8200),
            dict(category="Utilities",        date="2025-01-10", amount=320),
            dict(category="Utilities",        date="2025-02-10", amount=310),
            dict(category="Accounting & Tax", date="2025-03-20", amount=1500),
            dict(category="Insurance (G&A)",  date="2025-01-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-02-01", amount=600),
            # 2026 entries
            dict(category="Office Rent",      date="2026-01-01", amount=2600),
            dict(category="Office Rent",      date="2026-02-01", amount=2600),
            dict(category="Office Rent",      date="2026-03-01", amount=2600),
            dict(category="Office Rent",      date="2026-04-01", amount=2600),
            dict(category="Salaries",         date="2026-01-15", amount=8500),
            dict(category="Salaries",         date="2026-02-15", amount=8500),
            dict(category="Salaries",         date="2026-03-15", amount=8500),
            dict(category="Salaries",         date="2026-04-15", amount=8500),
            dict(category="Utilities",        date="2026-01-10", amount=350),
            dict(category="Utilities",        date="2026-02-10", amount=340),
            dict(category="Utilities",        date="2026-03-10", amount=360),
            dict(category="Accounting & Tax", date="2026-01-25", amount=800),
            dict(category="Insurance (G&A)",  date="2026-01-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-02-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-03-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-04-01", amount=650),
        ]
        for entry in GA_ENTRIES:
            exists = db.query(GaEntry).filter_by(
                company_id=cid, category=entry["category"], date=entry["date"]
            ).first()
            if not exists:
                db.add(GaEntry(company_id=cid, notes="", **entry))

        db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
```

- [ ] **Step 3: Run the seed script**

```bash
cd backend
export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
python -m seed.seed
```

Expected output:
```
Created company: EvaBus LLC (id=1)
Created role: admin
Created role: investor
Created role: manager
Created role: staff
Seed complete.
```

- [ ] **Step 4: Verify data in the database**

```bash
psql postgresql://evabus:evabus@localhost:5432/evabus -c "SELECT COUNT(*) FROM vehicles;"
# Expected: 10
psql postgresql://evabus:evabus@localhost:5432/evabus -c "SELECT COUNT(*) FROM jobs;"
# Expected: 8
psql postgresql://evabus:evabus@localhost:5432/evabus -c "SELECT name FROM roles;"
# Expected: admin, investor, manager, staff
```

- [ ] **Step 5: Run full test suite to confirm seed didn't break anything**

```bash
pytest tests/ -v
# All tests should still pass
```

- [ ] **Step 6: Commit**

```bash
git add backend/seed/
git commit -m "feat(backend): idempotent seed script with company, RBAC, vehicles, drivers, jobs, G&A"
```

---

## Plan Complete — What's Next

**Plan 2: CRUD API Layer** — Pydantic schemas + CRUD routers for all 15 entity groups. Each router uses `require_permission()` and filters by `company_id`. This replaces the stub routes added in Task 8.

**Plan 3: Business Logic + Reports** — Port `report.ts`, `profit.ts` computation to Python services. Implement `/api/v1/reports/pl`, `/reports/vehicle`, `/reports/job-group`, `/profitability`, and `/dashboard` endpoints.
