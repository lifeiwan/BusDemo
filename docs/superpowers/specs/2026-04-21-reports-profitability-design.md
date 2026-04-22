# Reports & Profitability Backend Design

**Date:** 2026-04-21
**Status:** Approved

## Overview

Move the report and profitability computation from the React frontend (`profit.ts`, `report.ts`) into Python service classes on the FastAPI backend. The frontend becomes a pure rendering layer. Dashboard is explicitly out of scope — it will be redesigned separately.

---

## Endpoints

### Reports (`permission: reports`)

```
GET /api/v1/reports/pl?year=2026
GET /api/v1/reports/vehicle?year=2026&month=3
GET /api/v1/reports/vehicle?year=2026&ytd=true
GET /api/v1/reports/job-group?year=2026&month=3
GET /api/v1/reports/job-group?year=2026&ytd=true
```

### Profitability (`permission: profit-center`)

```
GET /api/v1/profitability?from=2026-01-01&to=2026-03-31&dimension=vehicle
```

`dimension` must be one of: `vehicle`, `job-group`, `customer`, `driver`. Returns 422 if missing or invalid.

---

## File Map

**New files:**
```
backend/
├── app/
│   ├── services/
│   │   ├── report.py          # P&L, vehicle, job-group computation
│   │   └── profitability.py   # profitability by dimension
│   ├── schemas/
│   │   └── reports.py         # Pydantic response models
│   └── routers/
│       ├── reports.py         # /api/v1/reports/*
│       └── profitability.py   # /api/v1/profitability
└── tests/
    ├── test_report_service.py  # service-level unit tests (no HTTP)
    ├── test_reports.py         # HTTP-level tests for /reports/*
    └── test_profitability.py   # HTTP-level tests for /profitability
```

**Modified files:**
- `backend/app/main.py` — add two `include_router` calls

---

## Response Shapes

### P&L Report

```json
{
  "year": 2026,
  "months": [
    {
      "revenue": 50000.00,
      "driver_payroll": 15000.00,
      "fuel": 3200.00,
      "maintenance": 800.00,
      "insurance": 1200.00,
      "loan": 2400.00,
      "eld": 120.00,
      "management_fee": 500.00,
      "parking": 300.00,
      "ez_pass": 450.00,
      "other_cogs": 200.00,
      "ga": {"Office Rent": 2500.00, "Utilities": 300.00}
    }
  ]
}
```

12 entries in `months`, index 0 = January, index 11 = December.

### Vehicle Report

```json
[
  {
    "vehicle_id": 1,
    "label": "2022 Blue Bird Vision (TST-001)",
    "revenue": 18000.00,
    "payroll": 5400.00,
    "fuel": 1100.00,
    "repair": 300.00,
    "others": 80.00,
    "ez_pass": 150.00,
    "insurance": 400.00,
    "management_fee": 175.00,
    "loan": 800.00,
    "parking": 100.00,
    "eld": 40.00,
    "net": 9455.00
  }
]
```

Sorted by revenue descending. YTD variant sums all months from January through `month_count`.

### Job-Group Report

Same shape as Vehicle Report, but with `job_group_id` instead of `vehicle_id`.

### Profitability

```json
[
  {
    "id": 1,
    "label": "2022 Blue Bird Vision",
    "revenue": 54000.00,
    "costs": 38000.00,
    "net_profit": 16000.00,
    "margin": 29.6,
    "accounts_receivable": null
  }
]
```

`accounts_receivable` is populated only for `dimension=customer`; `null` for all other dimensions. Sorted by `net_profit` descending.

---

## Service Layer

### `app/services/report.py`

Functions (all scoped to `company_id`):

| Function | Returns |
|---|---|
| `build_pl_report(db, company_id, year)` | `PLReportResult` |
| `build_vehicle_report(db, company_id, year, month)` | `list[VehicleRow]` |
| `build_vehicle_ytd_report(db, company_id, year, month_count)` | `list[VehicleRow]` |
| `build_job_group_report(db, company_id, year, month)` | `list[JobGroupRow]` |
| `build_job_group_ytd_report(db, company_id, year, month_count)` | `list[JobGroupRow]` |

### `app/services/profitability.py`

| Function | Returns |
|---|---|
| `compute_profitability(db, company_id, from_date, to_date, dimension)` | `list[ProfitRow]` |

Dispatches internally to `_by_vehicle`, `_by_job_group`, `_by_customer`, `_by_driver`.

---

## Computation Rules

These are a direct port of `frontend/src/lib/profit.ts` and `report.ts`.

**Active job in period:** `job.start_date ≤ period_end AND (job.end_date IS NULL OR job.end_date ≥ period_start)`

**Revenue per period:** job base `revenue` + income `job_line_items` with `date` in period.

**Insurance cost per month:**
- `type = monthly` → `cost × 1`
- `type = yearly` → `cost ÷ 12`

**Vehicle fixed costs per month:** `cost × 1` (already monthly).

**Parking per month:**
- `type = monthly` → `cost × 1`
- `type = one_time` → `cost` if `date` falls in the period, else 0

**EZ-Pass:** `job_line_items` with `direction = cost` and `category = "EZ-Pass"`, dated in the period.

**Other COGS:** `job_line_items` with `direction = cost` and `category ≠ "EZ-Pass"`, dated in the period.

**G&A (P&L only):** `ga_entries` dated in the month, grouped by `category`.

**Vehicle/job-group cost allocation:** Costs (fuel, repair, insurance, fixed costs, parking) are attributed to the vehicles that appear on jobs in that group for that period. A vehicle shared across groups is counted once per group that uses it.

**Profitability date range:** Uses `from_date`/`to_date` directly. `months_in_range` = number of calendar months partially or fully covered (used for prorating monthly costs).

**`net` field (vehicle/job-group reports):** `revenue - payroll - fuel - repair - others - ez_pass - insurance - management_fee - loan - parking - eld`

**`net_profit` field (profitability):** `revenue - costs` where costs include all vehicle costs + line item costs + driver payroll. G&A is NOT included (profitability is pre-G&A).

---

## Router Behavior

### `/reports/vehicle` and `/reports/job-group`

Query parameter rules:
- `year` required (integer)
- Either `month` (1–12) or `ytd=true` required; both present → 422; neither present → 422
- If `ytd=true` and `year == current_year`: compute months 1 through current month
- If `ytd=true` and `year < current_year`: compute all 12 months

### `/profitability`

- `from` and `to` required (YYYY-MM-DD strings); parsed with `datetime.date.fromisoformat`
- `dimension` required; must be `vehicle`, `job-group`, `customer`, or `driver`; else 422

---

## Access Control

| Endpoint | Permission resource |
|---|---|
| `/api/v1/reports/*` | `reports` |
| `/api/v1/profitability` | `profit-center` |

Uses the existing `require_permission(resource, "read")` dependency. The `authed_client` test fixture already grants all permissions including `reports` and `profit-center`.

---

## Testing Strategy

### Service tests (`test_report_service.py`)

Call service functions directly with the test `db` session. Seed minimal data (1 vehicle, 1 job, a few line items, 1 fuel entry, 1 insurance policy) and assert that computed fields are arithmetically correct. No HTTP involved.

### Router tests (`test_reports.py`, `test_profitability.py`)

Use `authed_client`. Seed minimal data, call the endpoint, assert `status_code == 200` and spot-check one or two fields in the response to confirm the service was wired correctly.

One test per endpoint variant:
- `test_pl_report` — checks 12 months returned
- `test_vehicle_report_month` — checks `status_code` and vehicle row shape
- `test_vehicle_report_ytd` — checks `status_code`
- `test_vehicle_report_invalid_params` — both `month` + `ytd=true` → 422
- `test_job_group_report_month` — checks shape
- `test_job_group_report_ytd` — checks `status_code`
- `test_profitability_by_vehicle` — checks row shape and `accounts_receivable` is null
- `test_profitability_by_customer` — checks `accounts_receivable` is populated
- `test_profitability_invalid_dimension` — 422
