# Revenue-Driven Fleet Management — Frontend Implementation Plan
**Date:** 2026-04-09  
**Spec:** `docs/superpowers/specs/2026-04-08-revenue-fleet-design.md`  
**Scope:** React frontend with static data only (backend deferred)

---

## File Map

Files to create or replace (all under `frontend/src/`):

### Types
- `types/index.ts` — all shared TypeScript interfaces

### Data
- `data/vehicles.ts`
- `data/drivers.ts`
- `data/driverVehicleAssignments.ts`
- `data/customers.ts`
- `data/jobGroups.ts`
- `data/jobs.ts`
- `data/jobLineItems.ts`
- `data/maintenanceEntries.ts`
- `data/fuelEntries.ts`
- `data/inspections.ts`
- `data/insurancePolicies.ts`
- `data/parkingEntries.ts`
- `data/driverCosts.ts`
- `data/index.ts` — barrel re-export

### Lib
- `lib/profit.ts` — profit calculation engine

### Components
- `components/TopNav.tsx` — top navigation bar
- `components/Sidebar.tsx` — context-sensitive left sidebar
- `components/StatCard.tsx` — KPI card with sparkline
- `components/ProfitTable.tsx` — ranked table: Revenue / Costs / Profit / Margin
- `components/EntityDetail.tsx` — shell layout for detail pages (header + tab bar)
- `components/Badge.tsx` — status badge

### Pages
- `pages/Dashboard.tsx`
- `pages/JobGroups.tsx`
- `pages/Jobs.tsx`
- `pages/Profitability.tsx`
- `pages/Vehicles.tsx`
- `pages/VehicleDetail.tsx`
- `pages/Customers.tsx`
- `pages/CustomerDetail.tsx`
- `pages/Drivers.tsx`

### App shell
- `App.tsx` — router setup, layout shell
- `index.css` — Tailwind base styles (replace existing)
- `main.tsx` — entry point (replace existing)

---

## Tasks

### Task 1 — Set up TypeScript types
**File:** `src/types/index.ts`

Create all shared interfaces that mirror the data model. This locks in the shape before any data or logic is written.

```typescript
export interface Vehicle {
  id: number;
  year: number;
  make: string;
  model: string;
  vin: string;
  status: 'active' | 'maintenance' | 'out_of_service';
  mileage: number;
  color: string;
}

export interface Driver {
  id: number;
  name: string;
  license: string;
  licenseExpiry: string; // YYYY-MM-DD
  phone: string;
  status: 'active' | 'inactive';
}

export interface DriverVehicleAssignment {
  id: number;
  driverId: number;
  vehicleId: number;
  startDate: string;
  endDate: string | null; // null = currently assigned
}

export interface Customer {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface JobGroup {
  id: number;
  name: string;
  type: 'route' | 'one_time';
  description: string;
}

export interface Job {
  id: number;
  name: string;
  jobGroupId: number;
  vehicleId: number;
  driverId: number | null;
  customerId: number;
  revenue: number;
  recurrence: string; // 'daily' | 'weekly' | 'monthly' | 'one_time'
  startDate: string;
  endDate: string | null;
  status: 'active' | 'completed' | 'scheduled';
}

export interface JobLineItem {
  id: number;
  jobId: number;
  date: string;
  category: string; // 'toll' | 'parking' | 'misc_cost' | 'misc_income' | ...
  direction: 'cost' | 'income';
  amount: number;
  notes: string;
}

export interface MaintenanceEntry {
  id: number;
  vehicleId: number;
  date: string;
  type: string;
  mileage: number;
  cost: number;
  tech: string;
  notes: string;
}

export interface FuelEntry {
  id: number;
  vehicleId: number;
  date: string;
  gallons: number;
  cpg: number;
  total: number;
  odometer: number;
  full: boolean;
}

export interface Inspection {
  id: number;
  vehicleId: number;
  date: string;
  driverName: string;
  results: Record<string, 'pass' | 'fail'>;
  pass: boolean;
  notes: string;
}

export interface InsurancePolicy {
  id: number;
  vehicleId: number;
  provider: string;
  type: 'monthly' | 'yearly';
  cost: number;
  startDate: string;
  notes: string;
}

export interface ParkingEntry {
  id: number;
  vehicleId: number;
  type: 'monthly' | 'one_time';
  cost: number;
  startDate: string | null;
  date: string | null;
  location: string;
  jobId: number | null;
  notes: string;
}

export interface DriverCost {
  id: number;
  driverId: number;
  jobId: number | null;
  date: string;
  type: 'salary' | 'bonus' | 'reimbursement' | 'other';
  amount: number;
  notes: string;
}

// Derived types for profit calculations
export interface ProfitRow {
  id: number | string;
  label: string;
  revenue: number;
  costs: number;
  netProfit: number;
  margin: number; // 0-100
}
```

**Test:** TypeScript compiles with no errors after all data files are created.

**Commit:** `feat: add TypeScript type definitions`

---

### Task 2 — Create static data files
**Files:** `src/data/*.ts`, `src/data/index.ts`

Translate data from `fleet-demo.html` into typed TypeScript arrays. Add the new entities (customers, jobGroups, driverVehicleAssignments, jobLineItems) that don't exist in the demo.

#### `src/data/vehicles.ts`
```typescript
import type { Vehicle } from '../types';

export const vehicles: Vehicle[] = [
  { id:1,  year:2021, make:"Ford",       model:"F-150",         vin:"1FTFW1E83MFA12345", status:"active",        mileage:34210, color:"White"  },
  { id:2,  year:2020, make:"Chevrolet",  model:"Silverado 1500",vin:"3GCUYDED0LG123456", status:"active",        mileage:51880, color:"Black"  },
  { id:3,  year:2022, make:"RAM",        model:"1500",          vin:"1C6SRFFT3NN123456", status:"maintenance",   mileage:22450, color:"Red"    },
  { id:4,  year:2019, make:"Toyota",     model:"Tacoma",        vin:"5TFAX5GN0KX123456", status:"active",        mileage:67300, color:"Silver" },
  { id:5,  year:2023, make:"Ford",       model:"Transit 250",   vin:"1FTBR1C84PKA12345", status:"active",        mileage:14500, color:"White"  },
  { id:6,  year:2018, make:"GMC",        model:"Sierra 2500HD", vin:"1GT22REG5JF123456", status:"out_of_service",mileage:98750, color:"Gray"   },
  { id:7,  year:2021, make:"Nissan",     model:"Frontier",      vin:"1N6AD0ER8MN123456", status:"active",        mileage:29800, color:"Blue"   },
  { id:8,  year:2022, make:"Mercedes",   model:"Sprinter 2500", vin:"W1Y40CHY4NT123456", status:"maintenance",   mileage:41200, color:"White"  },
  { id:9,  year:2020, make:"Toyota",     model:"Tundra",        vin:"5TFDY5F12LX123456", status:"active",        mileage:55600, color:"Black"  },
  { id:10, year:2023, make:"Chevrolet",  model:"Express 2500",  vin:"1GCWGBFP1P1123456", status:"active",        mileage:8900,  color:"White"  },
];
```

#### `src/data/drivers.ts`
```typescript
import type { Driver } from '../types';

export const drivers: Driver[] = [
  { id:1, name:"James T.",  license:"CA-DL784521", licenseExpiry:"2027-06-15", phone:"555-0101", status:"active"   },
  { id:2, name:"Karen M.",  license:"CA-DL293847", licenseExpiry:"2026-09-30", phone:"555-0102", status:"active"   },
  { id:3, name:"Luis R.",   license:"CA-DL847562", licenseExpiry:"2028-02-28", phone:"555-0103", status:"active"   },
  { id:4, name:"Dana W.",   license:"CA-DL192837", licenseExpiry:"2027-11-20", phone:"555-0104", status:"active"   },
  { id:5, name:"Tony B.",   license:"CA-DL374819", licenseExpiry:"2026-07-15", phone:"555-0105", status:"active"   },
  { id:6, name:"Sarah L.",  license:"CA-DL583920", licenseExpiry:"2028-05-10", phone:"555-0106", status:"active"   },
  { id:7, name:"Mike R.",   license:"CA-DL920183", licenseExpiry:"2027-03-22", phone:"555-0107", status:"inactive" },
];
```

#### `src/data/driverVehicleAssignments.ts`
```typescript
import type { DriverVehicleAssignment } from '../types';

// Derived from demo: each driver had a single vehicleId — converted to assignments
export const driverVehicleAssignments: DriverVehicleAssignment[] = [
  { id:1, driverId:1, vehicleId:1, startDate:"2026-01-01", endDate:null },
  { id:2, driverId:2, vehicleId:3, startDate:"2026-01-01", endDate:null },
  { id:3, driverId:3, vehicleId:5, startDate:"2026-01-01", endDate:null },
  { id:4, driverId:4, vehicleId:2, startDate:"2026-01-01", endDate:null },
  { id:5, driverId:5, vehicleId:4, startDate:"2026-01-01", endDate:null },
  { id:6, driverId:6, vehicleId:7, startDate:"2026-01-01", endDate:null },
];
```

#### `src/data/customers.ts`
```typescript
import type { Customer } from '../types';

export const customers: Customer[] = [
  { id:1, name:"TechCorp Inc.",        contactName:"Alan Park",     email:"alan@techcorp.com",      phone:"555-1001", notes:"Key enterprise account" },
  { id:2, name:"Riverside School Dist",contactName:"Linda Chen",    email:"lchen@riverside.edu",    phone:"555-1002", notes:"Annual transport contract" },
  { id:3, name:"Metro Events Co.",     contactName:"Ben Davis",     email:"ben@metroevents.com",    phone:"555-1003", notes:"Seasonal event work" },
  { id:4, name:"Apex Logistics",       contactName:"Sara Kim",      email:"sara@apexlog.com",       phone:"555-1004", notes:"Weekly warehouse runs" },
  { id:5, name:"City Medical Center",  contactName:"Dr. Tom Walsh", email:"twalsh@citymed.org",     phone:"555-1005", notes:"Medical supply chain" },
  { id:6, name:"County Fair Authority",contactName:"Janet Reed",    email:"jreed@countyfair.org",   phone:"555-1006", notes:"Annual fair shuttle" },
  { id:7, name:"BuildRight Construction",contactName:"Frank Lee",   email:"frank@buildright.com",   phone:"555-1007", notes:"Site haul jobs" },
  { id:8, name:"Airport Authority",    contactName:"Carol Diaz",    email:"carol@airport.org",      phone:"555-1008", notes:"Daily shuttle route" },
];
```

#### `src/data/jobGroups.ts`
```typescript
import type { JobGroup } from '../types';

export const jobGroups: JobGroup[] = [
  { id:1, name:"Shuttle Routes",      type:"route",    description:"Recurring daily/weekly shuttle contracts" },
  { id:2, name:"Delivery Contracts",  type:"route",    description:"Recurring delivery and transport routes" },
  { id:3, name:"Corporate One-Time",  type:"one_time", description:"Ad-hoc corporate moves and events" },
  { id:4, name:"Emergency & Special", type:"one_time", description:"Unscheduled urgent jobs" },
];
```

#### `src/data/jobs.ts`
```typescript
import type { Job } from '../types';

// Jobs enriched with customerId and jobGroupId (new fields vs demo)
export const jobs: Job[] = [
  { id:1,  name:"Airport Shuttle Route A",    jobGroupId:1, vehicleId:1,  driverId:1,    customerId:8, revenue:350,  recurrence:"daily",   startDate:"2026-01-01", endDate:null,         status:"active"    },
  { id:2,  name:"Downtown Delivery Circuit",  jobGroupId:2, vehicleId:2,  driverId:4,    customerId:4, revenue:280,  recurrence:"daily",   startDate:"2026-01-01", endDate:null,         status:"active"    },
  { id:3,  name:"Warehouse Run — North",      jobGroupId:2, vehicleId:5,  driverId:3,    customerId:4, revenue:420,  recurrence:"weekly",  startDate:"2026-01-05", endDate:null,         status:"active"    },
  { id:4,  name:"School District Transport",  jobGroupId:1, vehicleId:7,  driverId:6,    customerId:2, revenue:190,  recurrence:"weekly",  startDate:"2026-01-06", endDate:null,         status:"active"    },
  { id:5,  name:"County Fair Shuttle",        jobGroupId:1, vehicleId:9,  driverId:1,    customerId:6, revenue:310,  recurrence:"weekly",  startDate:"2026-02-01", endDate:null,         status:"active"    },
  { id:6,  name:"Corporate Move — TechCorp",  jobGroupId:3, vehicleId:8,  driverId:null, customerId:1, revenue:1200, recurrence:"one_time",startDate:"2026-03-15", endDate:"2026-03-15", status:"completed" },
  { id:7,  name:"Event Staff Transport",      jobGroupId:3, vehicleId:4,  driverId:5,    customerId:3, revenue:650,  recurrence:"one_time",startDate:"2026-03-22", endDate:"2026-03-22", status:"completed" },
  { id:8,  name:"Emergency Parts Delivery",   jobGroupId:4, vehicleId:9,  driverId:1,    customerId:5, revenue:380,  recurrence:"one_time",startDate:"2026-03-28", endDate:"2026-03-28", status:"completed" },
  { id:9,  name:"Construction Site Haul",     jobGroupId:4, vehicleId:10, driverId:null, customerId:7, revenue:890,  recurrence:"one_time",startDate:"2026-03-10", endDate:"2026-03-10", status:"completed" },
  { id:10, name:"Medical Supply Run",         jobGroupId:4, vehicleId:1,  driverId:1,    customerId:5, revenue:450,  recurrence:"one_time",startDate:"2026-02-20", endDate:"2026-02-20", status:"completed" },
];
```

#### `src/data/jobLineItems.ts`
```typescript
import type { JobLineItem } from '../types';

// Toll and misc items; parking already in parkingEntries
export const jobLineItems: JobLineItem[] = [
  { id:1, jobId:6, date:"2026-03-15", category:"toll",         direction:"cost",   amount:12.50, notes:"Bridge toll" },
  { id:2, jobId:7, date:"2026-03-22", category:"misc_income",  direction:"income",  amount:50.00, notes:"Gratuity from client" },
  { id:3, jobId:8, date:"2026-03-28", category:"toll",         direction:"cost",   amount:8.00,  notes:"Highway toll" },
  { id:4, jobId:9, date:"2026-03-10", category:"misc_cost",    direction:"cost",   amount:75.00, notes:"Equipment rental" },
];
```

#### Carry-over data files (translate directly from demo)
`src/data/maintenanceEntries.ts`, `src/data/fuelEntries.ts`, `src/data/inspections.ts`, `src/data/insurancePolicies.ts`, `src/data/parkingEntries.ts`, `src/data/driverCosts.ts` — translate the arrays from `fleet-demo.html` verbatim into typed TS files. Use the same values shown in the demo.

**Note on driverCosts:** Remove the `vehicleId` field (not in the new schema). Add `jobId: null` to all existing entries since they are salary/bonus, not job-specific.

#### `src/data/index.ts`
```typescript
export * from './vehicles';
export * from './drivers';
export * from './driverVehicleAssignments';
export * from './customers';
export * from './jobGroups';
export * from './jobs';
export * from './jobLineItems';
export * from './maintenanceEntries';
export * from './fuelEntries';
export * from './inspections';
export * from './insurancePolicies';
export * from './parkingEntries';
export * from './driverCosts';
```

**Test:** `import * from './data'` in App.tsx resolves cleanly, `tsc --noEmit` passes.

**Commit:** `feat: add static seed data from fleet-demo.html`

---

### Task 3 — Profit calculation engine
**File:** `src/lib/profit.ts`

This is the core business logic. All profit figures are derived here — never stored.

```typescript
import type { ProfitRow } from '../types';
import {
  jobs, jobLineItems, maintenanceEntries, fuelEntries,
  insurancePolicies, parkingEntries, driverCosts,
  vehicles, drivers, customers, jobGroups,
} from '../data';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

// Default: current calendar month
export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.startDate && date <= range.endDate;
}

// ── Cost helpers ──────────────────────────────────────────

// Monthly insurance prorated to a date range (fraction of 30-day month)
function insuranceCostForVehicle(vehicleId: number, range: DateRange): number {
  return insurancePolicies
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      const monthly = p.type === 'monthly' ? p.cost : p.cost / 12;
      return sum + monthly;
    }, 0);
}

function maintenanceCostForVehicle(vehicleId: number, range: DateRange): number {
  return maintenanceEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.cost, 0);
}

function fuelCostForVehicle(vehicleId: number, range: DateRange): number {
  return fuelEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.total, 0);
}

function parkingCostForVehicle(vehicleId: number, range: DateRange): number {
  return parkingEntries
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      if (p.type === 'monthly' && p.startDate) return sum + p.cost; // monthly = flat per period
      if (p.type === 'one_time' && p.date && inRange(p.date, range)) return sum + p.cost;
      return sum;
    }, 0);
}

function driverCostForDriver(driverId: number, range: DateRange): number {
  return driverCosts
    .filter(c => c.driverId === driverId && inRange(c.date, range))
    .reduce((s, c) => s + c.amount, 0);
}

// Net profit for a single job given the date range
export function jobNetProfit(jobId: number, range: DateRange): number {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return 0;

  const lineIncome = jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'income')
    .reduce((s, li) => s + li.amount, 0);
  const lineCost = jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'cost')
    .reduce((s, li) => s + li.amount, 0);

  const vehicleCosts =
    maintenanceCostForVehicle(job.vehicleId, range) +
    fuelCostForVehicle(job.vehicleId, range) +
    insuranceCostForVehicle(job.vehicleId, range) +
    parkingCostForVehicle(job.vehicleId, range);

  const driverCostTotal = job.driverId
    ? driverCostForDriver(job.driverId, range)
    : 0;

  const totalCosts = lineCost + vehicleCosts + driverCostTotal;
  const totalRevenue = job.revenue + lineIncome;
  return totalRevenue - totalCosts;
}

// ── Pivot functions ───────────────────────────────────────

// Filter jobs active in the range (started before endDate, not ended before startDate)
function activeJobs(range: DateRange) {
  return jobs.filter(j => {
    const started = j.startDate <= range.endDate;
    const notEnded = !j.endDate || j.endDate >= range.startDate;
    return started && notEnded;
  });
}

export function profitByJobGroup(range: DateRange): ProfitRow[] {
  return jobGroups.map(jg => {
    const jgJobs = activeJobs(range).filter(j => j.jobGroupId === jg.id);
    const revenue = jgJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = jgJobs.reduce((s, j) => {
      const net = jobNetProfit(j.id, range);
      return s + (j.revenue - net);
    }, 0);
    const netProfit = revenue - costs;
    return { id: jg.id, label: jg.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }).sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByVehicle(range: DateRange): ProfitRow[] {
  return vehicles.map(v => {
    const vJobs = activeJobs(range).filter(j => j.vehicleId === v.id);
    const revenue = vJobs.reduce((s, j) => s + j.revenue, 0);
    const costs =
      maintenanceCostForVehicle(v.id, range) +
      fuelCostForVehicle(v.id, range) +
      insuranceCostForVehicle(v.id, range) +
      parkingCostForVehicle(v.id, range);
    const netProfit = revenue - costs;
    return { id: v.id, label: `${v.year} ${v.make} ${v.model}`, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }).filter(r => r.revenue > 0 || r.costs > 0).sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByCustomer(range: DateRange): ProfitRow[] {
  return customers.map(c => {
    const cJobs = activeJobs(range).filter(j => j.customerId === c.id);
    const revenue = cJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = cJobs.reduce((s, j) => {
      const net = jobNetProfit(j.id, range);
      return s + (j.revenue - net);
    }, 0);
    const netProfit = revenue - costs;
    return { id: c.id, label: c.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }).filter(r => r.revenue > 0 || r.costs > 0).sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByDriver(range: DateRange): ProfitRow[] {
  return drivers.map(d => {
    const dJobs = activeJobs(range).filter(j => j.driverId === d.id);
    const revenue = dJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = driverCostForDriver(d.id, range);
    const netProfit = revenue - costs;
    return { id: d.id, label: d.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }).filter(r => r.revenue > 0 || r.costs > 0).sort((a, b) => b.netProfit - a.netProfit);
}

// Returns last N months, each as a ProfitRow
export function profitByPeriod(months = 6): ProfitRow[] {
  const result: ProfitRow[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const range: DateRange = {
      startDate: new Date(y, m, 1).toISOString().slice(0, 10),
      endDate: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    const periodJobs = activeJobs(range);
    const revenue = periodJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = periodJobs.reduce((s, j) => {
      const net = jobNetProfit(j.id, range);
      return s + (j.revenue - net);
    }, 0);
    const netProfit = revenue - costs;
    result.push({ id: label, label, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 });
  }
  return result;
}

// ── Dashboard KPIs ────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  topCustomer: string;
  mostProfitableVehicle: string;
  fleetUtilizationRate: number; // 0-100
  sparklineRevenue: number[];   // last 6 months
  sparklineProfit: number[];
}

export function getDashboardKPIs(range: DateRange): DashboardKPIs {
  const byCustomer = profitByCustomer(range);
  const byVehicle = profitByVehicle(range);
  const periodData = profitByPeriod(6);

  const totalRevenue = byVehicle.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = byVehicle.reduce((s, r) => s + r.netProfit, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const topCustomer = byCustomer[0]?.label ?? '—';
  const mostProfitableVehicle = byVehicle[0]?.label ?? '—';

  const activeVehicleIds = new Set(activeJobs(range).map(j => j.vehicleId));
  const fleetUtilizationRate = vehicles.length > 0
    ? (activeVehicleIds.size / vehicles.length) * 100
    : 0;

  return {
    totalRevenue,
    totalProfit,
    profitMargin,
    topCustomer,
    mostProfitableVehicle,
    fleetUtilizationRate,
    sparklineRevenue: periodData.map(p => p.revenue),
    sparklineProfit: periodData.map(p => p.netProfit),
  };
}
```

**Test:** Import `getDashboardKPIs` in a test or console; verify totals are non-zero and margin is between 0-100.

**Commit:** `feat: add profit calculation engine`

---

### Task 4 — App shell: routing and layout
**Files:** `src/main.tsx`, `src/index.css`, `src/App.tsx`

#### `src/index.css`
Replace the existing Vite default with Tailwind directives only:
```css
@import "tailwindcss";
```

#### `src/App.tsx`
Set up the router and the top-level layout (TopNav + conditional Sidebar + content area). Page components are imported but can be stubs initially.

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import JobGroups from './pages/JobGroups';
import Jobs from './pages/Jobs';
import Profitability from './pages/Profitability';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Drivers from './pages/Drivers';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-slate-100">
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profit/job-groups" element={<JobGroups />} />
              <Route path="/profit/jobs" element={<Jobs />} />
              <Route path="/profit/profitability" element={<Profitability />} />
              <Route path="/master/vehicles" element={<Vehicles />} />
              <Route path="/master/vehicles/:id" element={<VehicleDetail />} />
              <Route path="/master/customers" element={<Customers />} />
              <Route path="/master/customers/:id" element={<CustomerDetail />} />
              <Route path="/master/drivers" element={<Drivers />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
```

Create stub pages (just return `<div>PageName</div>`) for all pages so the router compiles.

**Test:** `npm run dev` in `frontend/` — app loads, top nav visible, clicking nav links changes URL.

**Commit:** `feat: add app shell with routing`

---

### Task 5 — TopNav component
**File:** `src/components/TopNav.tsx`

The top bar is always visible. It shows the app name and 3 section links. The active section is highlighted. Use `useLocation` to determine active section.

```tsx
import { Link, useLocation } from 'react-router-dom';

const sections = [
  { label: 'Dashboard',     path: '/' },
  { label: 'Profit Center', path: '/profit/job-groups' },
  { label: 'Master Data',   path: '/master/vehicles' },
];

export default function TopNav() {
  const { pathname } = useLocation();

  function isActive(path: string) {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path.split('/')[1] === 'profit' ? '/profit' : '/master');
  }

  return (
    <header className="bg-slate-800 text-white flex items-center px-6 h-14 shrink-0 gap-8">
      <span className="font-bold text-lg tracking-tight">
        Fleet<span className="text-blue-400">Pro</span>
      </span>
      <nav className="flex gap-1">
        {sections.map(s => (
          <Link
            key={s.path}
            to={s.path}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isActive(s.path)
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
```

**Test:** Navigate to `/`, `/profit/job-groups`, `/master/vehicles` — correct section highlights.

**Commit:** `feat: add TopNav component`

---

### Task 6 — Sidebar component
**File:** `src/components/Sidebar.tsx`

Sidebar is hidden on Dashboard (`/`). It shows different items for Profit Center vs Master Data sections.

```tsx
import { Link, useLocation } from 'react-router-dom';

const profitItems = [
  { label: 'Job Groups',    path: '/profit/job-groups' },
  { label: 'Jobs',          path: '/profit/jobs' },
  { label: 'Profitability', path: '/profit/profitability' },
];

const masterItems = [
  { label: 'Vehicles',  path: '/master/vehicles', children: [
    { label: 'Maintenance', path: '/master/vehicles' }, // handled via tab in VehicleDetail
    { label: 'Fuel',        path: '/master/vehicles' },
    { label: 'Inspections', path: '/master/vehicles' },
  ]},
  { label: 'Customers', path: '/master/customers' },
  { label: 'Drivers',   path: '/master/drivers' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  const inProfit = pathname.startsWith('/profit');
  const inMaster = pathname.startsWith('/master');

  if (!inProfit && !inMaster) return null; // Dashboard = no sidebar

  const items = inProfit ? profitItems : masterItems;

  return (
    <aside className="w-52 bg-slate-800 text-slate-300 flex-shrink-0 overflow-y-auto py-4">
      {items.map(item => (
        <div key={item.path}>
          <Link
            to={item.path}
            className={`flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${
              pathname === item.path || pathname.startsWith(item.path + '/')
                ? 'bg-blue-500 text-white'
                : 'hover:bg-slate-700 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
          {'children' in item && item.children && inMaster && pathname.startsWith('/master/vehicles') &&
            item.label === 'Vehicles' && (
              <div className="ml-4 border-l border-slate-700">
                {item.children.map(child => (
                  <span key={child.label} className="block px-4 py-1.5 text-xs text-slate-400">
                    {child.label}
                  </span>
                ))}
              </div>
            )
          }
        </div>
      ))}
    </aside>
  );
}
```

**Note:** Vehicles sub-items (Maintenance/Fuel/Inspections) are tabs within the VehicleDetail page, not separate routes. The sidebar shows them as visual hints only.

**Test:** Navigate across sections — sidebar appears/disappears correctly, active items highlight.

**Commit:** `feat: add Sidebar component`

---

### Task 7 — Shared components: StatCard, Badge, ProfitTable, EntityDetail
**Files:** `src/components/StatCard.tsx`, `src/components/Badge.tsx`, `src/components/ProfitTable.tsx`, `src/components/EntityDetail.tsx`

#### `src/components/Badge.tsx`
```tsx
const colorMap: Record<string, string> = {
  active:         'bg-green-100 text-green-800',
  maintenance:    'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-red-100 text-red-800',
  completed:      'bg-green-100 text-green-800',
  scheduled:      'bg-yellow-100 text-yellow-800',
  route:          'bg-purple-100 text-purple-800',
  one_time:       'bg-cyan-100 text-cyan-800',
  pass:           'bg-green-100 text-green-800',
  fail:           'bg-red-100 text-red-800',
  inactive:       'bg-slate-100 text-slate-600',
};

export default function Badge({ value }: { value: string }) {
  const cls = colorMap[value] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
```

#### `src/components/StatCard.tsx`
```tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  label: string;
  value: string;
  sparkline?: number[];
  positive?: boolean; // controls sparkline color
}

export default function StatCard({ label, value, sparkline, positive = true }: Props) {
  const data = sparkline?.map((v, i) => ({ i, v }));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {data && data.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={positive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

#### `src/components/ProfitTable.tsx`
```tsx
import type { ProfitRow } from '../types';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface Props {
  rows: ProfitRow[];
}

export default function ProfitTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Costs</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Profit</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt$(row.revenue)}</td>
              <td className="px-4 py-3 text-right text-red-600">{fmt$(row.costs)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt$(row.netProfit)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`text-xs font-semibold ${row.margin >= 20 ? 'text-green-600' : row.margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {row.margin.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

#### `src/components/EntityDetail.tsx`
Shell for detail pages (Vehicle, Customer). Provides a header and a tab bar.

```tsx
interface Tab {
  label: string;
  key: string;
}

interface Props {
  title: string;
  subtitle?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}

export default function EntityDetail({ title, subtitle, tabs, activeTab, onTabChange, children }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
```

**Test:** Components render without errors. StatCard shows sparkline when `sparkline` prop is provided.

**Commit:** `feat: add shared UI components`

---

### Task 8 — Dashboard page
**File:** `src/pages/Dashboard.tsx`

Full-width KPI page. No sidebar (handled by App.tsx routing — Dashboard route exists at `/`).

```tsx
import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import { getDashboardKPIs, currentMonthRange } from '../lib/profit';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Dashboard() {
  const kpis = useMemo(() => getDashboardKPIs(currentMonthRange()), []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Month-to-date performance overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue (MTD)" value={fmt$(kpis.totalRevenue)} sparkline={kpis.sparklineRevenue} />
        <StatCard label="Total Profit (MTD)" value={fmt$(kpis.totalProfit)} sparkline={kpis.sparklineProfit} positive={kpis.totalProfit >= 0} />
        <StatCard label="Profit Margin" value={kpis.profitMargin.toFixed(1) + '%'} />
        <StatCard label="Top Customer" value={kpis.topCustomer} />
        <StatCard label="Most Profitable Vehicle" value={kpis.mostProfitableVehicle} />
        <StatCard label="Fleet Utilization" value={kpis.fleetUtilizationRate.toFixed(0) + '%'} />
      </div>
    </div>
  );
}
```

**Test:** Load `/` — 6 KPI cards visible, values are non-zero.

**Commit:** `feat: add Dashboard page`

---

### Task 9 — Job Groups page
**File:** `src/pages/JobGroups.tsx`

Lists all job groups, each row showing job count, revenue, costs, profit for the current month.

```tsx
import { useMemo } from 'react';
import { jobGroups, jobs } from '../data';
import { profitByJobGroup, currentMonthRange } from '../lib/profit';
import ProfitTable from '../components/ProfitTable';
import Badge from '../components/Badge';

export default function JobGroups() {
  const range = useMemo(currentMonthRange, []);
  const rows = useMemo(() => profitByJobGroup(range), [range]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Job Groups</h1>
        <p className="text-sm text-slate-500 mt-1">Route contracts and one-time job categories</p>
      </div>

      {/* Summary cards per group type */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {jobGroups.map(jg => {
          const count = jobs.filter(j => j.jobGroupId === jg.id).length;
          return (
            <div key={jg.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-800">{jg.name}</span>
                <Badge value={jg.type} />
              </div>
              <p className="text-sm text-slate-500">{jg.description}</p>
              <p className="text-sm text-slate-500 mt-1">{count} job{count !== 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Profitability by Job Group (Current Month)</h2>
        </div>
        <ProfitTable rows={rows} />
      </div>
    </div>
  );
}
```

**Test:** Load `/profit/job-groups` — all 4 groups listed, ProfitTable populated.

**Commit:** `feat: add Job Groups page`

---

### Task 10 — Jobs page
**File:** `src/pages/Jobs.tsx`

Full list of all jobs as a table. Each row links to its customer and vehicle.

```tsx
import { Link } from 'react-router-dom';
import { jobs, vehicles, drivers, customers, jobGroups } from '../data';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Jobs() {
  const lookup = {
    vehicle: (id: number) => vehicles.find(v => v.id === id),
    driver: (id: number | null) => id ? drivers.find(d => d.id === id) : null,
    customer: (id: number) => customers.find(c => c.id === id),
    jobGroup: (id: number) => jobGroups.find(jg => jg.id === id),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">{jobs.length} total jobs</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Job', 'Group', 'Customer', 'Vehicle', 'Driver', 'Revenue', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const vehicle = lookup.vehicle(job.vehicleId);
              const driver = lookup.driver(job.driverId);
              const customer = lookup.customer(job.customerId);
              const jg = lookup.jobGroup(job.jobGroupId);
              return (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{job.name}</td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {customer ? (
                      <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline">
                        {customer.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {vehicle ? (
                      <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(job.revenue)}</td>
                  <td className="px-4 py-3"><Badge value={job.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Test:** Load `/profit/jobs` — 10 rows, customer/vehicle links work.

**Commit:** `feat: add Jobs page`

---

### Task 11 — Profitability page
**File:** `src/pages/Profitability.tsx`

Single page with a tab bar (Job Group / Vehicle / Customer / Driver / Period). Each tab renders ProfitTable + a bar chart.

```tsx
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProfitTable from '../components/ProfitTable';
import {
  profitByJobGroup, profitByVehicle, profitByCustomer, profitByDriver, profitByPeriod,
  currentMonthRange,
} from '../lib/profit';
import type { ProfitRow } from '../types';

const TABS = ['Job Group', 'Vehicle', 'Customer', 'Driver', 'Period'] as const;
type Tab = typeof TABS[number];

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Profitability() {
  const [activeTab, setActiveTab] = useState<Tab>('Period');
  const range = useMemo(currentMonthRange, []);

  const rows = useMemo((): ProfitRow[] => {
    switch (activeTab) {
      case 'Job Group': return profitByJobGroup(range);
      case 'Vehicle':   return profitByVehicle(range);
      case 'Customer':  return profitByCustomer(range);
      case 'Driver':    return profitByDriver(range);
      case 'Period':    return profitByPeriod(6);
    }
  }, [activeTab, range]);

  const chartData = rows.map(r => ({
    name: r.label.length > 15 ? r.label.slice(0, 13) + '…' : r.label,
    Revenue: r.revenue,
    Costs: r.costs,
    Profit: r.netProfit,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Profitability</h1>
        <p className="text-sm text-slate-500 mt-1">Revenue, costs, and net profit by dimension</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab ? 'bg-blue-500 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => fmt$(v)} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => fmt$(v)} />
            <Legend />
            <Bar dataKey="Revenue" fill="#3b82f6" />
            <Bar dataKey="Costs" fill="#ef4444" />
            <Bar dataKey="Profit" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <ProfitTable rows={rows} />
      </div>
    </div>
  );
}
```

**Test:** Load `/profit/profitability` — all 5 tabs switch correctly, chart updates, table shows data.

**Commit:** `feat: add Profitability page`

---

### Task 12 — Vehicles list page
**File:** `src/pages/Vehicles.tsx`

```tsx
import { Link } from 'react-router-dom';
import { vehicles, maintenanceEntries } from '../data';
import Badge from '../components/Badge';

export default function Vehicles() {
  const lastSvc = (id: number) => {
    const entries = maintenanceEntries.filter(e => e.vehicleId === id).sort((a, b) => b.date.localeCompare(a.date));
    return entries[0]?.date ?? '—';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vehicles</h1>
        <p className="text-sm text-slate-500 mt-1">{vehicles.length} vehicles in fleet</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Vehicle', 'VIN', 'Mileage', 'Status', 'Last Service'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/master/vehicles/${v.id}`} className="font-medium text-blue-600 hover:underline">
                    {v.year} {v.make} {v.model}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.vin}</td>
                <td className="px-4 py-3 text-slate-600">{v.mileage.toLocaleString()} mi</td>
                <td className="px-4 py-3"><Badge value={v.status} /></td>
                <td className="px-4 py-3 text-slate-500">{lastSvc(v.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Test:** Load `/master/vehicles` — 10 vehicles listed, links to detail work.

**Commit:** `feat: add Vehicles list page`

---

### Task 13 — Vehicle detail page
**File:** `src/pages/VehicleDetail.tsx`

Uses `EntityDetail` shell with Maintenance / Fuel / Inspections tabs. Shows a cost summary card at the top.

```tsx
import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { vehicles, maintenanceEntries, fuelEntries, inspections } from '../data';
import { currentMonthRange } from '../lib/profit';
import EntityDetail from '../components/EntityDetail';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function VehicleDetail() {
  const { id } = useParams();
  const vehicle = vehicles.find(v => v.id === Number(id));
  const [tab, setTab] = useState('maintenance');

  if (!vehicle) return <Navigate to="/master/vehicles" replace />;

  const range = currentMonthRange();
  const maint = maintenanceEntries.filter(e => e.vehicleId === vehicle.id);
  const fuel = fuelEntries.filter(e => e.vehicleId === vehicle.id);
  const insp = inspections.filter(e => e.vehicleId === vehicle.id);

  const maintCost = useMemo(() => maint.filter(e => e.date >= range.startDate && e.date <= range.endDate).reduce((s, e) => s + e.cost, 0), []);
  const fuelCost = useMemo(() => fuel.filter(e => e.date >= range.startDate && e.date <= range.endDate).reduce((s, e) => s + e.total, 0), []);

  return (
    <EntityDetail
      title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      subtitle={`VIN: ${vehicle.vin} · ${vehicle.mileage.toLocaleString()} mi · ${vehicle.color}`}
      tabs={[
        { label: 'Maintenance', key: 'maintenance' },
        { label: 'Fuel', key: 'fuel' },
        { label: 'Inspections', key: 'inspections' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      {/* Cost summary */}
      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Maintenance (MTD)</p>
          <p className="text-xl font-bold text-slate-800">{fmt$(maintCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fuel (MTD)</p>
          <p className="text-xl font-bold text-slate-800">{fmt$(fuelCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
          <Badge value={vehicle.status} />
        </div>
      </div>

      {tab === 'maintenance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Type', 'Mileage', 'Cost', 'Tech', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maint.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3 font-medium">{e.type}</td>
                  <td className="px-4 py-3 text-slate-600">{e.mileage.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold">{fmt$(e.cost)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.tech}</td>
                  <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'fuel' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Gallons', 'CPG', 'Total', 'Odometer'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fuel.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3">{e.gallons}</td>
                  <td className="px-4 py-3">${e.cpg.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">{fmt$(e.total)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.odometer.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'inspections' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Driver', 'Result', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insp.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3">{e.driverName}</td>
                  <td className="px-4 py-3"><Badge value={e.pass ? 'pass' : 'fail'} /></td>
                  <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EntityDetail>
  );
}
```

**Test:** Click a vehicle from the list — detail page loads, 3 tabs switch correctly, cost cards show values.

**Commit:** `feat: add Vehicle detail page`

---

### Task 14 — Customers pages
**Files:** `src/pages/Customers.tsx`, `src/pages/CustomerDetail.tsx`

#### `src/pages/Customers.tsx`
```tsx
import { Link } from 'react-router-dom';
import { customers, jobs } from '../data';
import { profitByCustomer, currentMonthRange } from '../lib/profit';
import { useMemo } from 'react';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Customers() {
  const range = useMemo(currentMonthRange, []);
  const profitRows = useMemo(() => profitByCustomer(range), [range]);
  const profitMap = Object.fromEntries(profitRows.map(r => [r.id, r]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">{customers.length} customers</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Customer', 'Contact', 'Jobs', 'Revenue (MTD)', 'Net Profit (MTD)'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const jobCount = jobs.filter(j => j.customerId === c.id).length;
              const profit = profitMap[c.id];
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/master/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.contactName}</td>
                  <td className="px-4 py-3 text-slate-600">{jobCount}</td>
                  <td className="px-4 py-3 font-semibold">{profit ? fmt$(profit.revenue) : '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${profit && profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit ? fmt$(profit.netProfit) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### `src/pages/CustomerDetail.tsx`
```tsx
import { useParams, Navigate, Link } from 'react-router-dom';
import { customers, jobs, vehicles, drivers, jobGroups } from '../data';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CustomerDetail() {
  const { id } = useParams();
  const customer = customers.find(c => c.id === Number(id));
  if (!customer) return <Navigate to="/master/customers" replace />;

  const customerJobs = jobs.filter(j => j.customerId === customer.id);
  const totalRevenue = customerJobs.reduce((s, j) => s + j.revenue, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {customer.contactName} · {customer.email} · {customer.phone}
        </p>
        {customer.notes && <p className="text-sm text-slate-400 mt-1">{customer.notes}</p>}
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-800">{customerJobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Revenue (All Time)</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(totalRevenue)}</p>
        </div>
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Job', 'Group', 'Vehicle', 'Driver', 'Revenue', 'Date', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customerJobs.map(job => {
              const v = vehicles.find(x => x.id === job.vehicleId);
              const d = job.driverId ? drivers.find(x => x.id === job.driverId) : null;
              const jg = jobGroups.find(x => x.id === job.jobGroupId);
              return (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{job.name}</td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {v ? <Link to={`/master/vehicles/${v.id}`} className="text-blue-600 hover:underline">{v.year} {v.make} {v.model}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{fmt$(job.revenue)}</td>
                  <td className="px-4 py-3 text-slate-500">{job.startDate}</td>
                  <td className="px-4 py-3"><Badge value={job.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Test:** Load `/master/customers` — customer list with revenue. Click a customer — detail page shows jobs table and summary.

**Commit:** `feat: add Customers pages`

---

### Task 15 — Drivers page
**File:** `src/pages/Drivers.tsx`

```tsx
import { drivers, driverVehicleAssignments, vehicles, driverCosts } from '../data';
import { currentMonthRange } from '../lib/profit';
import { useMemo } from 'react';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Drivers() {
  const range = useMemo(currentMonthRange, []);

  const currentVehicle = (driverId: number) => {
    const assignment = driverVehicleAssignments.find(a => a.driverId === driverId && !a.endDate);
    if (!assignment) return '—';
    const v = vehicles.find(x => x.id === assignment.vehicleId);
    return v ? `${v.year} ${v.make} ${v.model}` : '—';
  };

  const driverCostMTD = (driverId: number) => {
    return driverCosts
      .filter(c => c.driverId === driverId && c.date >= range.startDate && c.date <= range.endDate)
      .reduce((s, c) => s + c.amount, 0);
  };

  const isExpiringSoon = (expiry: string) => {
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
    return days < 90;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Drivers</h1>
        <p className="text-sm text-slate-500 mt-1">{drivers.length} drivers</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Driver', 'Phone', 'License', 'Expiry', 'Current Vehicle', 'Cost (MTD)', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.license}</td>
                <td className={`px-4 py-3 text-sm ${isExpiringSoon(d.licenseExpiry) ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                  {d.licenseExpiry}
                  {isExpiringSoon(d.licenseExpiry) && <span className="ml-1 text-xs">(soon)</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{currentVehicle(d.id)}</td>
                <td className="px-4 py-3 font-semibold">{fmt$(driverCostMTD(d.id))}</td>
                <td className="px-4 py-3"><Badge value={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Test:** Load `/master/drivers` — 7 drivers, expiring licenses flagged in amber.

**Commit:** `feat: add Drivers page`

---

### Task 16 — Final wiring and smoke test
1. Replace stub pages in `App.tsx` with real imports (already done if pages were created progressively).
2. Run `npm run build` in `frontend/` — must pass with zero TypeScript errors.
3. Run `npm run dev` and manually navigate every route:
   - `/` → Dashboard KPIs visible
   - `/profit/job-groups` → groups table
   - `/profit/jobs` → 10 jobs
   - `/profit/profitability` → all 5 tabs work, chart renders
   - `/master/vehicles` → 10 vehicles
   - `/master/vehicles/1` → detail with 3 tabs
   - `/master/customers` → customer list with revenue
   - `/master/customers/1` → TechCorp detail with jobs
   - `/master/drivers` → 7 drivers
4. Verify sidebar shows/hides correctly on each section.
5. Verify TopNav highlights correct section.

**Commit:** `feat: complete revenue-driven fleet management frontend`

---

## Implementation Order

```
Task 1  → Types
Task 2  → Data files
Task 3  → Profit engine (depends on types + data)
Task 4  → App shell (depends on types; page stubs are fine)
Task 5  → TopNav
Task 6  → Sidebar
Task 7  → Shared components (StatCard, Badge, ProfitTable, EntityDetail)
Task 8  → Dashboard (depends on profit engine + StatCard)
Task 9  → JobGroups (depends on profit engine + ProfitTable + Badge)
Task 10 → Jobs (depends on Badge)
Task 11 → Profitability (depends on profit engine + ProfitTable)
Task 12 → Vehicles list (depends on Badge)
Task 13 → VehicleDetail (depends on EntityDetail + Badge)
Task 14 → Customers (depends on profit engine + Badge)
Task 15 → Drivers (depends on Badge)
Task 16 → Final wiring + smoke test
```

Tasks 5-7 can be done in parallel once Task 4 is done. Tasks 8-15 can be done in parallel once Tasks 3 and 7 are done.
