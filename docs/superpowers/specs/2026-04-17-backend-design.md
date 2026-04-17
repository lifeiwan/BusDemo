# EvaBus Backend Design

**Date:** 2026-04-17
**Status:** Approved

## Overview

A FastAPI (Python) REST backend deployed on GCP, backed by Cloud SQL PostgreSQL, with Firebase Authentication. Serves the EvaBus fleet management frontend currently running as a static in-memory React app. All report computation moves server-side; the frontend becomes a pure rendering layer.

---

## Architecture

```
Firebase Hosting          Cloud Run (GCP)           Cloud SQL (GCP)
┌─────────────────┐       ┌──────────────────┐       ┌──────────────┐
│  React SPA      │──────▶│  FastAPI (Python) │──────▶│  PostgreSQL  │
│  (Vite build)   │ HTTPS │                  │       │              │
└─────────────────┘       │  - Auth middleware│       │  17 tables   │
                          │  - REST routes    │       └──────────────┘
        ▲                 │  - Report services│
        │ login/token     └──────────────────┘
┌───────┴─────────┐               ▲
│ Firebase Auth   │───────────────┘ verify ID token
└─────────────────┘
```

**Request flow:**
1. User logs in via Firebase Auth (email/password) — receives a Firebase ID token
2. React app sends `Authorization: Bearer <token>` on every API request
3. FastAPI middleware verifies the token against Firebase, loads user role + permissions from DB
4. FastAPI queries Cloud SQL and returns JSON
5. Frontend renders the response

**Key principles:**
- Stateless API — no server-side sessions
- All entity tables carry `company_id` for future multi-tenancy (one company in seed data)
- Report computation (currently in `report.ts` / `profit.ts`) moves to Python services
- Secrets managed via GCP Secret Manager — no credentials in code

---

## Database Schema

**17 tables total.** All entity tables include `id SERIAL PRIMARY KEY`, `company_id INTEGER REFERENCES companies(id)`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

### companies
```sql
id, name, created_at
```

### users
```sql
id, company_id, firebase_uid, email, name, role_id, is_active, created_at
```

### RBAC tables
```sql
roles             — id, company_id, name, description
permissions       — id, resource, action
                    e.g. ('profit_center','read'), ('reports','read'), ('users','write')
role_permissions  — role_id, permission_id
```

Four default roles seeded at startup: `admin`, `investor`, `manager`, `staff`.

Adding a new role = insert into `roles` + assign rows in `role_permissions`. No migration or redeploy required.

### Operational tables
```sql
vehicles                — year, make, model, vin, license_plate,
                          status ENUM('active','maintenance','out_of_service'),
                          mileage, color

drivers                 — name, license, license_expiry, phone,
                          status ENUM('active','inactive')

driver_vehicle_assignments — driver_id, vehicle_id, start_date, end_date

customers               — name, contact_name, email, phone, notes

job_groups              — name, type ENUM('route','one_time'), description

jobs                    — name, job_group_id, vehicle_id, driver_id, customer_id,
                          revenue, driver_payroll, payments_received, recurrence,
                          start_date, end_date,
                          status ENUM('active','completed','scheduled')

job_line_items          — job_id, date, category,
                          direction ENUM('cost','income'), amount, notes
```

### Vehicle operations tables
```sql
maintenance_entries     — vehicle_id, date, type, mileage, cost, tech, notes

fuel_entries            — vehicle_id, date, gallons, cpg, total, odometer, full BOOLEAN

inspections             — vehicle_id, date, driver_name, results JSONB, pass BOOLEAN, notes
                          (results uses JSONB — flexible key/value map of check items)

insurance_policies      — vehicle_id, provider,
                          type ENUM('monthly','yearly'), cost, start_date, notes

parking_entries         — vehicle_id, type ENUM('monthly','one_time'), cost,
                          start_date, date, location, job_id, notes

vehicle_fixed_costs     — vehicle_id, type ENUM('loan','eld','management_fee'),
                          cost, start_date, notes

driver_costs            — driver_id, job_id, date,
                          type ENUM('salary','bonus','reimbursement','other'),
                          amount, notes
```

### G&A
```sql
ga_entries              — category, date, amount, notes
```

---

## Access Control

Four default roles and their permissions:

| Resource | Staff | Manager | Investor | Admin |
|----------|-------|---------|----------|-------|
| operations (job groups, jobs) | R/W | R/W | R | R/W |
| master-data (vehicles, drivers, customers) | R/W | R/W | R | R/W |
| vehicle-ops (maintenance, fuel, inspections, etc.) | R/W | R/W | R | R/W |
| ga-expenses | R/W | R/W | R | R/W |
| profit-center (profitability) | ✗ | R/W | R | R/W |
| reports (P&L, vehicle, job group) | ✗ | R/W | R | R/W |
| users & roles | ✗ | ✗ | ✗ | R/W |

Permissions are stored in the `permissions` and `role_permissions` tables — modifiable without code changes or redeployment.

---

## API Design

**Base URL:** `https://<cloud-run-service>/api/v1`

### Standard CRUD (example: vehicles)
```
GET    /api/v1/vehicles          list all for company
POST   /api/v1/vehicles          create
GET    /api/v1/vehicles/{id}     get one
PUT    /api/v1/vehicles/{id}     full update
DELETE /api/v1/vehicles/{id}     delete
```

All resources follow this flat pattern. Nested resources (e.g. fuel entries per vehicle) are not nested in the URL — they are filtered by query parameter (`?vehicle_id=5`).

### Endpoint groups
```
/api/v1/vehicles
/api/v1/drivers
/api/v1/driver-vehicle-assignments
/api/v1/customers
/api/v1/job-groups
/api/v1/jobs
/api/v1/job-line-items
/api/v1/maintenance
/api/v1/fuel
/api/v1/inspections
/api/v1/insurance
/api/v1/parking
/api/v1/vehicle-fixed-costs
/api/v1/driver-costs
/api/v1/ga-entries
/api/v1/users
/api/v1/roles
/api/v1/dashboard
/api/v1/profitability
/api/v1/reports/pl
/api/v1/reports/vehicle
/api/v1/reports/job-group
```

### Report endpoints
```
GET /api/v1/reports/pl?year=2026
GET /api/v1/reports/vehicle?year=2026&month=3
GET /api/v1/reports/vehicle?year=2026&ytd=true
GET /api/v1/reports/job-group?year=2026&month=3
GET /api/v1/reports/job-group?year=2026&ytd=true
GET /api/v1/profitability?from=2026-01-01&to=2026-04-30&dimension=vehicle
GET /api/v1/dashboard
```

Report computation (P&L aggregation, cost allocation by vehicle/job group, G&A totals) runs in Python service classes — not in the frontend.

---

## Project Structure

```
BusDemo/
├── frontend/                      # existing React app (unchanged)
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    ├── docker-compose.yml         # local dev (FastAPI + local Postgres)
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    ├── app/
    │   ├── main.py                # FastAPI app init, CORS, middleware registration
    │   ├── config.py              # settings loaded from Secret Manager / env
    │   ├── database.py            # SQLAlchemy engine + session dependency
    │   ├── middleware/
    │   │   └── auth.py            # Firebase token verification + permission enforcement
    │   ├── models/                # SQLAlchemy ORM models
    │   │   ├── company.py
    │   │   ├── user.py            # User, Role, Permission, RolePermission
    │   │   ├── vehicle.py         # Vehicle, VehicleFixedCost, InsurancePolicy,
    │   │   │                      #   ParkingEntry, MaintenanceEntry, FuelEntry, Inspection
    │   │   ├── driver.py          # Driver, DriverVehicleAssignment, DriverCost
    │   │   ├── customer.py
    │   │   ├── job.py             # JobGroup, Job, JobLineItem
    │   │   └── ga.py
    │   ├── schemas/               # Pydantic request/response models
    │   │   ├── vehicle.py
    │   │   ├── driver.py
    │   │   ├── customer.py
    │   │   ├── job.py
    │   │   ├── ga.py
    │   │   ├── user.py
    │   │   └── reports.py
    │   ├── routers/               # HTTP layer only — one file per endpoint group
    │   │   ├── vehicles.py
    │   │   ├── drivers.py
    │   │   ├── customers.py
    │   │   ├── jobs.py
    │   │   ├── ga.py
    │   │   ├── reports.py
    │   │   ├── profitability.py
    │   │   ├── dashboard.py
    │   │   └── users.py
    │   └── services/              # business logic, no HTTP concerns
    │       ├── report.py          # P&L, vehicle, job group computation
    │       ├── profitability.py   # profitability by dimension + date range
    │       └── dashboard.py       # KPI aggregation
    └── seed/
        └── seed.py                # loads frontend seed data into DB (run once)
```

**Separation principle:** routers handle HTTP (auth checks, request validation, response shape); services handle all business logic (computation, DB queries). Services are independently testable without HTTP.

---

## Deployment

### GCP Services

| Service | Purpose | Est. monthly cost |
|---------|---------|-------------------|
| Cloud Run | FastAPI container | ~$0 (low traffic free tier) |
| Cloud SQL db-f1-micro | PostgreSQL | ~$7–10 |
| Firebase Hosting | React SPA static files | Free |
| Firebase Auth | Authentication (up to 10K users) | Free |
| Artifact Registry | Docker image storage | ~$0.10/GB |
| Secret Manager | DB credentials, Firebase config | ~$0 |
| **Total** | | **~$8–11/month** |

### CI/CD Pipeline (GitHub Actions)
```
push to main
  → run tests
  → build Docker image
  → push to Artifact Registry
  → deploy to Cloud Run
  → firebase deploy (frontend)
```

### Cloud SQL Connection
Cloud Run connects to Cloud SQL via the **Cloud SQL Auth Proxy** using the `--add-cloudsql-instances` flag. No public IP on the database.

### Local Development
`docker-compose` runs FastAPI + a local Postgres container. The Vite dev server proxies `/api` to the local FastAPI instance. No Cloud SQL needed locally.

### Secrets
All credentials stored in GCP Secret Manager, injected as environment variables at Cloud Run deploy time:
- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS` (service account JSON)

### Migrations
Alembic manages all schema changes. Run `alembic upgrade head` as part of the deploy step before Cloud Run traffic switches to the new revision.

---

## Multi-Tenancy Readiness

Every entity table has `company_id`. The auth middleware attaches `company_id` from the authenticated user's record to every DB query — no cross-company data leakage possible. Adding a second company is an insert into `companies` and `users`. No schema changes required.
