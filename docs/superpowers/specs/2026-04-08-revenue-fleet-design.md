# Revenue-Driven Fleet Management — Design Spec
**Date:** 2026-04-08
**Status:** Approved

## Overview

Redesign the BusDemo fleet management web app from an operations-focused view to a **revenue and profit-driven** application. The current single-file HTML demo (`fleet-demo.html`) becomes the data reference and seed. The new app is built as a React frontend with static data (cloud backend deferred).

---

## 1. Navigation & Information Architecture

### Top Navigation Bar (always visible)
Three sections:
```
[ Dashboard ]  [ Profit Center ]  [ Master Data ]
```

### Context-Sensitive Left Sidebar

**Dashboard selected:**
- No sidebar — full-width KPI canvas

**Profit Center selected:**
```
├── Job Groups
├── Jobs
└── Profitability
```

**Master Data selected:**
```
├── Vehicles
│    ├── Maintenance
│    ├── Fuel
│    └── Inspections
├── Customers
└── Drivers
```

### URL Structure (React Router v6)
```
/                              → Dashboard
/profit/job-groups             → Job Groups
/profit/jobs                   → Jobs
/profit/profitability          → Profitability (default tab: Period)
/master/vehicles               → Vehicles list
/master/vehicles/:id           → Vehicle detail (Maintenance / Fuel / Inspections tabs)
/master/customers              → Customers list
/master/customers/:id          → Customer detail + P&L history
/master/drivers                → Drivers list
```

---

## 2. Views

### Dashboard (Landing Page)
Headline KPIs with trend sparklines:
- Total Revenue (MTD)
- Total Profit (MTD)
- Profit Margin %
- Top Customer (by revenue)
- Most Profitable Vehicle
- Fleet Utilization Rate

Full-width layout, no sidebar.

### Job Groups
List of job groups by type: **Route** (recurring contracts) and **One-Time** jobs.
Each group shows: number of jobs, total revenue, total costs, net profit for the current period.

### Jobs
Full list of all jobs. Columns: job name, job group, customer, vehicle, driver, revenue, status.
Links to customer and vehicle detail pages.

### Profitability
Single page with a **tab bar** for pivot dimension:
```
[ Job Group ] [ Vehicle ] [ Customer ] [ Driver ] [ Period ]
```
Each tab renders a ranked table + bar chart showing: Revenue | Costs | Net Profit | Margin %.

**Period tab:** Defaults to monthly view (last 12 months). Date-range filter (start_date / end_date) supported — month picker resolves to first/last day of the selected month.

### Vehicles (Master Data)
List with status badges. Each vehicle links to a detail page with three tabs:
- **Maintenance** — maintenance entries for this vehicle
- **Fuel** — fuel log entries for this vehicle
- **Inspections** — inspection records for this vehicle

Vehicle detail also shows a cost summary card (maintenance + fuel + insurance + parking totals).

### Customers (Master Data)
List of customers. Each links to a detail page showing:
- Contact information
- All jobs linked to this customer
- Per-customer P&L: total revenue, total costs, net profit, across all time

### Drivers (Master Data)
List of drivers with license status, contact info.
Drivers are linked to vehicles via many-to-many (a driver can drive multiple vehicles over time).

---

## 3. Data Model (Static / Frontend)

Static data lives in `src/data/` as TypeScript files, mirroring the eventual backend schema.

```typescript
// Many-to-many: driver ↔ vehicle
driverVehicleAssignments: { id, driverId, vehicleId, startDate, endDate | null }

// New entity
customers: { id, name, contactName, email, phone, notes }

// Jobs gain customerId and jobGroupId
jobs: { id, name, jobGroupId, vehicleId, driverId, customerId,
        revenue, recurrence, startDate, endDate, status }

// Job Groups
jobGroups: { id, name, type: 'route' | 'one_time', description }

// Extensible extra costs/income per job
jobLineItems: { id, jobId, date, category: string,
                direction: 'cost' | 'income', amount, notes }

// Existing tables carried over
vehicles, maintenanceEntries, fuelEntries, inspections,
insurancePolicies, parkingEntries, driverCosts
```

### Profit Calculation (client-side)
Profit is always derived, never stored:
```
Net Profit = job.revenue
           + sum(jobLineItems where direction='income')
           - sum(jobLineItems where direction='cost')
           - allocated maintenanceCost (by vehicle)
           - allocated fuelCost (by vehicle)
           - allocated driverCost (by driver)
           - allocated insuranceCost (by vehicle, prorated monthly)
           - allocated parkingCost (by vehicle/job)
```

Allocation is filtered by `start_date` / `end_date` range. Default period: current calendar month.

---

## 4. Frontend Architecture

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | React Context + `useMemo` for derived profit data (React Query added when backend is ready) |
| Data | Static `.ts` files in `src/data/` |

### Key Shared Components
- `TopNav` — 3-section bar, highlights active section, controls sidebar content
- `Sidebar` — renders items based on active top-nav section, supports nested items
- `StatCard` — KPI card with value, label, trend sparkline
- `ProfitTable` — ranked table with Revenue / Costs / Net Profit / Margin columns; reused across all Profitability tabs
- `EntityDetail` — shell layout (header + tab bar) reused for Vehicle and Customer detail pages

---

## 5. Project Structure

```
BusDemo/
├── fleet-demo.html            # Original demo — kept as data reference
├── frontend/
│   ├── src/
│   │   ├── data/              # Static TS data files (seed from fleet-demo.html)
│   │   ├── lib/               # Profit calculation utilities
│   │   ├── components/        # TopNav, Sidebar, StatCard, ProfitTable, EntityDetail, ...
│   │   ├── pages/             # Dashboard, JobGroups, Jobs, Profitability, Vehicles, ...
│   │   └── types/             # Shared TypeScript interfaces
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── docs/
    └── superpowers/specs/
        └── 2026-04-08-revenue-fleet-design.md
```

---

## 6. Backend (Deferred)

Backend is out of scope for the current demo. When ready:
- **Framework:** FastAPI + Python 3.12
- **Database:** PostgreSQL + SQLAlchemy ORM + Alembic migrations
- **Auth:** JWT (FastAPI Users)
- **Deployment:** Cloud (TBD)

Static data files in `src/data/` become the migration seed. React Query replaces direct data imports — no component changes required.

---

## 7. Out of Scope (This Phase)
- Authentication / multi-user
- Real-time data / websockets
- Mobile-responsive layout
- Backend API
- Data export (CSV, PDF)
