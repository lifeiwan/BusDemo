# Job Group Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform JobGroup into a dispatch template with customer, vehicle, default revenue/payroll, and recurrence; make Job a single occurrence (no recurrence/end_date); add "Schedule next run" button that pre-fills from the template; highlight jobs scheduled for today in amber.

**Architecture:** Backend: add 5 template columns to `job_groups`, drop `recurrence`/`end_date` from `jobs`, Alembic migration, update schemas and tests. Frontend: update TypeScript types, strip removed fields from `JobModal`, extend `JobGroups` page with template form + Schedule button + amber dot, add amber row highlight to `Jobs` page, clean up `JobDetail`.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), React/TypeScript/Tailwind/react-i18next (frontend).

---

## File Map

| File | Change |
|---|---|
| `backend/app/models/job.py` | JobGroup +5 cols; Job drop `recurrence`, `end_date` |
| `backend/app/schemas/job.py` | JobGroupBase +5 fields; JobBase drop `recurrence`, `end_date` |
| `backend/alembic/versions/a2b3c4d5e6f7_job_group_template.py` | New migration |
| `backend/tests/test_jobs.py` | Update payloads + add template field tests |
| `frontend/src/types/index.ts` | JobGroup +5 fields; Job drop `recurrence`, `endDate` |
| `frontend/src/components/JobModal.tsx` | Drop recurrence/endDate fields; add `prefill` prop |
| `frontend/src/pages/JobGroups.tsx` | Template fields in modal; Schedule button; amber dot |
| `frontend/src/pages/Jobs.tsx` | Drop recurrence column; amber today highlight |
| `frontend/src/pages/JobDetail.tsx` | Drop recurrence/endDate display; rename label |
| `frontend/src/i18n/locales/en.ts` | Add/rename/remove keys |
| `frontend/src/i18n/locales/es.ts` | Mirror en.ts changes |
| `frontend/src/i18n/locales/zh.ts` | Mirror en.ts changes |

---

### Task 1: Backend — model + schema changes

**Files:**
- Modify: `backend/app/models/job.py`
- Modify: `backend/app/schemas/job.py`

- [ ] **Step 1: Write the failing test**

In `backend/tests/test_jobs.py`, temporarily add this test to verify the new template fields are accepted and returned:

```python
def test_job_group_template_fields(authed_client):
    payload = {
        "name": "School Route A", "type": "route", "description": "",
        "recurrence": "weekly", "default_revenue": 1500.0, "default_driver_payroll": 500.0,
        "customer_id": None, "vehicle_id": None,
    }
    r = authed_client.post(BASE_GROUPS, json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["recurrence"] == "weekly"
    assert body["default_revenue"] == 1500.0
    assert body["default_driver_payroll"] == 500.0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_jobs.py::test_job_group_template_fields -v
```

Expected: FAIL — `recurrence` and `default_revenue` not in response (field unknown to schema).

- [ ] **Step 3: Update `backend/app/models/job.py`**

Replace the entire file with:

```python
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class JobGroup(Base, EntityMixin):
    __tablename__ = "job_groups"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False, default="route")  # route | one_time
    description: Mapped[str] = mapped_column(Text, default="")
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    default_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    default_driver_payroll: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    recurrence: Mapped[str] = mapped_column(String(20), nullable=False, default="one_time")


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
    revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    driver_payroll: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payments_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="active")  # active | completed | scheduled


class JobLineItem(Base, EntityMixin):
    __tablename__ = "job_line_items"

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    direction: Mapped[str] = mapped_column(String(6), nullable=False)  # cost | income
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 4: Update `backend/app/schemas/job.py`**

Replace the entire file with:

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class JobGroupBase(BaseModel):
    name: str
    type: str = "route"  # route | one_time
    description: str = ""
    customer_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    default_revenue: float = 0.0
    default_driver_payroll: float = 0.0
    recurrence: str = "one_time"  # daily | weekly | monthly | one_time


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
    revenue: float = 0.0
    driver_payroll: float = 0.0
    payments_received: float = 0.0
    start_date: str
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
    amount: float
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

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend
pytest tests/test_jobs.py::test_job_group_template_fields -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/job.py backend/app/schemas/job.py
git commit -m "feat: add template fields to JobGroup, remove recurrence/end_date from Job"
```

---

### Task 2: Alembic migration

**Files:**
- Create: `backend/alembic/versions/a2b3c4d5e6f7_job_group_template.py`

- [ ] **Step 1: Create the migration file**

Create `backend/alembic/versions/a2b3c4d5e6f7_job_group_template.py`:

```python
"""job_group_template

Revision ID: a2b3c4d5e6f7
Revises: 9cdfe8c7bd83
Create Date: 2026-04-27 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '9cdfe8c7bd83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add template columns to job_groups
    op.add_column('job_groups', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.add_column('job_groups', sa.Column('vehicle_id', sa.Integer(), nullable=True))
    op.add_column('job_groups', sa.Column('default_revenue', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('job_groups', sa.Column('default_driver_payroll', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('job_groups', sa.Column('recurrence', sa.String(length=20), nullable=False, server_default='one_time'))

    op.create_foreign_key('fk_job_groups_customer_id', 'job_groups', 'customers', ['customer_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_job_groups_vehicle_id', 'job_groups', 'vehicles', ['vehicle_id'], ['id'], ondelete='SET NULL')

    # Remove recurrence and end_date from jobs
    op.drop_column('jobs', 'recurrence')
    op.drop_column('jobs', 'end_date')


def downgrade() -> None:
    # Restore jobs columns
    op.add_column('jobs', sa.Column('end_date', sa.String(length=10), nullable=True))
    op.add_column('jobs', sa.Column('recurrence', sa.String(length=20), nullable=False, server_default='one_time'))

    # Remove job_groups template columns
    op.drop_constraint('fk_job_groups_vehicle_id', 'job_groups', type_='foreignkey')
    op.drop_constraint('fk_job_groups_customer_id', 'job_groups', type_='foreignkey')
    op.drop_column('job_groups', 'recurrence')
    op.drop_column('job_groups', 'default_driver_payroll')
    op.drop_column('job_groups', 'default_revenue')
    op.drop_column('job_groups', 'vehicle_id')
    op.drop_column('job_groups', 'customer_id')
```

- [ ] **Step 2: Run migration against Cloud SQL**

First get the DATABASE_URL from Secret Manager (already known):

```bash
export DATABASE_URL="postgresql://superbus:3SCbrhU2edV/QfOcBd/PY5QqO3UBIPqi6Qytpa7YKZE=@34.45.153.56/superbus?sslmode=require"
cd backend
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 9cdfe8c7bd83 -> a2b3c4d5e6f7, job_group_template
```

Note: You need to temporarily authorize your IP in Cloud SQL (done earlier via `gcloud sql instances patch`), run the migration, then remove it again.

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/a2b3c4d5e6f7_job_group_template.py
git commit -m "feat: alembic migration for job_group template columns"
```

---

### Task 3: Update backend tests

**Files:**
- Modify: `backend/tests/test_jobs.py`

- [ ] **Step 1: Replace the top of `test_jobs.py` with updated payloads**

Replace lines 1–16 (the constants and imports) with:

```python
import pytest

BASE_GROUPS = "/api/v1/job-groups"
BASE_JOBS = "/api/v1/jobs"
BASE_ITEMS = "/api/v1/job-line-items"

GROUP_PAYLOAD = {
    "name": "Airport Routes",
    "type": "route",
    "description": "Daily airport runs",
    "recurrence": "weekly",
    "default_revenue": 1500.0,
    "default_driver_payroll": 500.0,
    "customer_id": None,
    "vehicle_id": None,
}

JOB_PAYLOAD_TEMPLATE = {
    "name": "JFK Morning",
    "revenue": 5000.00,
    "driver_payroll": 1500.00,
    "payments_received": 5000.00,
    "start_date": "2024-01-01",
    "status": "active",
}
```

- [ ] **Step 2: Update `test_create_job_group` to verify template fields**

Replace `test_create_job_group`:

```python
def test_create_job_group(authed_client):
    r = authed_client.post(BASE_GROUPS, json=GROUP_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Airport Routes"
    assert body["recurrence"] == "weekly"
    assert body["default_revenue"] == 1500.0
    assert body["default_driver_payroll"] == 500.0
```

- [ ] **Step 3: Update `test_update_job` to remove `recurrence` from payload**

Replace `test_update_job`:

```python
def test_update_job(authed_client, group_id, job_id):
    payload = {**JOB_PAYLOAD_TEMPLATE, "job_group_id": group_id, "status": "completed"}
    r = authed_client.put(f"{BASE_JOBS}/{job_id}", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
```

- [ ] **Step 4: Add test verifying Job response has no recurrence or end_date**

Add this test after `test_create_job`:

```python
def test_job_has_no_recurrence_or_end_date(authed_client, group_id):
    payload = {**JOB_PAYLOAD_TEMPLATE, "job_group_id": group_id}
    r = authed_client.post(BASE_JOBS, json=payload)
    assert r.status_code == 201
    body = r.json()
    assert "recurrence" not in body
    assert "end_date" not in body
    assert "start_date" in body
```

- [ ] **Step 5: Run the full job test suite**

```bash
cd backend
pytest tests/test_jobs.py -v
```

Expected: All tests PASS.

- [ ] **Step 6: Run the full test suite to check nothing else broke**

```bash
cd backend
pytest -v
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/tests/test_jobs.py
git commit -m "test: update job tests for template fields and removed recurrence/end_date"
```

---

### Task 4: Frontend types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Update `JobGroup` interface**

In `frontend/src/types/index.ts`, replace the `JobGroup` interface:

```typescript
export interface JobGroup {
  id: number;
  name: string;
  type: 'route' | 'one_time';
  description: string;
  customerId: number | null;
  vehicleId: number | null;
  defaultRevenue: number;
  defaultDriverPayroll: number;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'one_time';
}
```

- [ ] **Step 2: Update `Job` interface**

Replace the `Job` interface (remove `recurrence` and `endDate`):

```typescript
export interface Job {
  id: number;
  name: string;
  jobGroupId: number;
  vehicleId: number | null;
  driverId: number | null;
  customerId: number | null;
  revenue: number;
  driverPayroll: number;
  paymentsReceived: number;
  startDate: string;
  status: 'active' | 'completed' | 'scheduled';
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: errors for files that still reference `recurrence`/`endDate` on `Job` or miss new `JobGroup` fields — these are fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: update JobGroup and Job TypeScript types for template redesign"
```

---

### Task 5: Update JobModal — remove recurrence/endDate, add prefill prop

**Files:**
- Modify: `frontend/src/components/JobModal.tsx`

This is the largest single-file change. Replace the entire file:

- [ ] **Step 1: Write the new `JobModal.tsx`**

Replace `frontend/src/components/JobModal.tsx` with:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Modal from './Modal';
import type { Job, JobLineItem } from '../types';

type FormState = Omit<Job, 'id'>;

function blankForm(
  prefill: Partial<FormState> = {},
  defaults: { vehicleId: number; customerId: number; jobGroupId: number }
): FormState {
  return {
    name: prefill.name ?? '',
    jobGroupId: prefill.jobGroupId ?? defaults.jobGroupId,
    vehicleId: prefill.vehicleId ?? defaults.vehicleId,
    driverId: prefill.driverId ?? null,
    customerId: prefill.customerId ?? defaults.customerId,
    revenue: prefill.revenue ?? 0,
    driverPayroll: prefill.driverPayroll ?? 0,
    paymentsReceived: 0,
    startDate: prefill.startDate ?? new Date().toISOString().slice(0, 10),
    status: 'scheduled',
  };
}

type DraftLineItem = Omit<JobLineItem, 'id' | 'jobId'> & { _key: number };
let _keyCounter = 0;
function draftKey() { return ++_keyCounter; }

const PRESET_CATEGORIES = ['EZ-Pass', 'Toll', 'Parking', 'Reimbursement', 'Other'];

type FuelDraft = { enabled: boolean; gallons: string; cpg: string; odometer: string };
const blankFuelDraft = (): FuelDraft => ({ enabled: false, gallons: '', cpg: '', odometer: '' });

interface Props {
  editing: Job | null;
  prefill?: Partial<FormState>;
  onClose: () => void;
}

export default function JobModal({ editing, prefill, onClose }: Props) {
  const { t } = useTranslation();
  const data = useData();
  const { jobs, vehicles, drivers, customers, jobGroups, jobLineItems,
    addJob, updateJob,
    addJobLineItem, deleteJobLineItemsByJobId,
    addFuel } = data;

  const defaults = {
    vehicleId: vehicles[0]?.id ?? 0,
    customerId: customers[0]?.id ?? 0,
    jobGroupId: jobGroups[0]?.id ?? 0,
  };

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name, jobGroupId: editing.jobGroupId,
          vehicleId: editing.vehicleId, driverId: editing.driverId,
          customerId: editing.customerId, revenue: editing.revenue,
          driverPayroll: editing.driverPayroll, paymentsReceived: editing.paymentsReceived,
          startDate: editing.startDate, status: editing.status,
        }
      : blankForm(prefill, defaults)
  );

  const [draftItems, setDraftItems] = useState<DraftLineItem[]>(() =>
    editing
      ? jobLineItems.filter(li => li.jobId === editing.id).map(li => ({
          _key: draftKey(),
          date: li.date, category: li.category,
          direction: li.direction, amount: li.amount, notes: li.notes,
        }))
      : []
  );

  const [newItem, setNewItem] = useState<Omit<DraftLineItem, '_key'>>({
    date: editing?.startDate ?? prefill?.startDate ?? new Date().toISOString().slice(0, 10),
    category: 'Toll', direction: 'cost', amount: 0, notes: '',
  });

  const [fuelDraft, setFuelDraft] = useState<FuelDraft>(blankFuelDraft);

  function addDraftItem() {
    if (!newItem.amount || Number(newItem.amount) === 0) return;
    setDraftItems(prev => [...prev, { ...newItem, amount: Number(newItem.amount), _key: draftKey() }]);
    setNewItem(prev => ({ ...prev, amount: 0, notes: '' }));
  }

  function removeDraftItem(key: number) {
    setDraftItems(prev => prev.filter(x => x._key !== key));
  }

  function save() {
    if (!form.name.trim() || !form.vehicleId || !form.customerId || !form.jobGroupId) return;
    if (form.driverId && !Number(form.driverPayroll)) return;
    const payload = {
      ...form,
      revenue: Number(form.revenue),
      driverPayroll: Number(form.driverPayroll),
      paymentsReceived: Number(form.paymentsReceived),
    };

    let jobId: number;
    if (editing) {
      updateJob({ ...editing, ...payload });
      jobId = editing.id;
      deleteJobLineItemsByJobId(jobId);
    } else {
      jobId = jobs.length === 0 ? 1 : Math.max(...jobs.map(j => j.id)) + 1;
      addJob(payload);
    }

    for (const item of draftItems) {
      addJobLineItem({ jobId, date: item.date, category: item.category, direction: item.direction, amount: item.amount, notes: item.notes });
    }

    if (fuelDraft.enabled && fuelDraft.gallons && fuelDraft.cpg && form.vehicleId) {
      const gallons = parseFloat(fuelDraft.gallons);
      const cpg = parseFloat(fuelDraft.cpg);
      addFuel({
        vehicleId: form.vehicleId,
        date: form.startDate,
        gallons, cpg,
        total: parseFloat((gallons * cpg).toFixed(2)),
        odometer: fuelDraft.odometer ? parseInt(fuelDraft.odometer) : 0,
        full: true,
      });
    }

    onClose();
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = field === 'driverId'
      ? (e.target.value === '' ? null : Number(e.target.value))
      : ['vehicleId', 'customerId', 'jobGroupId'].includes(field)
        ? Number(e.target.value)
        : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  const fuelTotal = fuelDraft.gallons && fuelDraft.cpg
    ? (parseFloat(fuelDraft.gallons) * parseFloat(fuelDraft.cpg)).toFixed(2)
    : '—';

  const lineItemsTotal = draftItems.reduce((s, x) => x.direction === 'cost' ? s - x.amount : s + x.amount, 0);
  const fmt$ = (n: number) => '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <Modal title={editing ? t('jobs.editTitle') : t('jobs.addTitle')} onClose={onClose} wide>
      <div className="space-y-5">

        {/* ── Job Details ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.jobName')} *</label>
            <input value={form.name} onChange={set('name')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('jobs.jobNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.jobGroup')} *</label>
            <select value={form.jobGroupId} onChange={set('jobGroupId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>{t('jobs.select')}</option>
              {jobGroups.map(jg => <option key={jg.id} value={jg.id}>{jg.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.customer')} *</label>
            <select value={form.customerId ?? 0} onChange={set('customerId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>{t('jobs.select')}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.vehicle')} *</label>
            <select value={form.vehicleId ?? 0} onChange={set('vehicleId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>{t('jobs.select')}</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.driver')}</label>
            <select value={form.driverId ?? ''} onChange={set('driverId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('jobs.unassigned')}</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('jobs.driverPayroll')} {form.driverId ? '*' : <span className="text-slate-400 font-normal">({t('common.optional')})</span>}
            </label>
            <input type="number" value={form.driverPayroll} onChange={set('driverPayroll')} min={0}
              disabled={!form.driverId}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.revenue')}</label>
            <input type="number" value={form.revenue} onChange={set('revenue')} min={0}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.paymentsReceived')}</label>
            <input type="number" value={form.paymentsReceived} onChange={set('paymentsReceived')} min={0}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobs.date')}</label>
            <input type="date" value={form.startDate} onChange={set('startDate')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.status')}</label>
            <select value={form.status} onChange={set('status')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">{t('status.active')}</option>
              <option value="scheduled">{t('status.scheduled')}</option>
              <option value="completed">{t('status.completed')}</option>
            </select>
          </div>
        </div>

        {/* ── One-Time Fees ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">{t('jobs.feesSection')}</h3>
            {draftItems.length > 0 && (
              <span className={`text-xs font-semibold ${lineItemsTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {t('jobs.feesNet')} {lineItemsTotal >= 0 ? '+' : ''}{fmt$(lineItemsTotal)}
              </span>
            )}
          </div>

          {draftItems.length > 0 && (
            <div className="mb-2 rounded-lg border border-slate-200 overflow-hidden text-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{t('jobs.feeDate')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{t('jobs.feeCategory')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{t('jobs.feeType')}</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{t('jobs.feeAmount')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{t('jobs.feeNotes')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map(item => (
                    <tr key={item._key} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-600">{item.date}</td>
                      <td className="px-3 py-2 font-medium">{item.category}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.direction === 'cost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {item.direction === 'cost' ? t('jobs.feeCost') : t('jobs.feeIncome')}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${item.direction === 'cost' ? 'text-red-600' : 'text-green-600'}`}>
                        {item.direction === 'cost' ? '-' : '+'}{fmt$(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{item.notes || '—'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeDraftItem(item._key)} className="text-slate-300 hover:text-red-500 transition-colors text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">{t('jobs.addFee')}</p>
            <div className="flex gap-1 mb-2">
              {PRESET_CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => setNewItem(x => ({ ...x, category: cat }))}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${newItem.category === cat ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('jobs.feeDate')}</label>
                <input type="date" value={newItem.date}
                  onChange={e => setNewItem(x => ({ ...x, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('jobs.feeCategory')}</label>
                <input value={newItem.category}
                  onChange={e => setNewItem(x => ({ ...x, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('jobs.feeCategoryPlaceholder')} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('jobs.feeType')}</label>
                <select value={newItem.direction}
                  onChange={e => setNewItem(x => ({ ...x, direction: e.target.value as 'cost' | 'income' }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cost">{t('jobs.feeCost')}</option>
                  <option value="income">{t('jobs.feeIncome')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('jobs.feeAmount')}</label>
                <input type="number" value={newItem.amount} min={0} step="0.01"
                  onChange={e => setNewItem(x => ({ ...x, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('jobs.feeNotes')}</label>
                <input value={newItem.notes}
                  onChange={e => setNewItem(x => ({ ...x, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('common.optional')} />
              </div>
            </div>
            <button onClick={addDraftItem}
              className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors">
              + {t('common.add')}
            </button>
          </div>
        </div>

        {/* ── Fuel Entry ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="fuel-toggle" checked={fuelDraft.enabled}
              onChange={e => setFuelDraft(f => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-blue-500" />
            <label htmlFor="fuel-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
              {t('jobs.fuelSection')}
            </label>
            {(form.vehicleId ?? 0) > 0 && (
              <span className="text-xs text-slate-400">
                → {vehicles.find(v => v.id === form.vehicleId)?.make} {vehicles.find(v => v.id === form.vehicleId)?.model}
              </span>
            )}
          </div>

          {fuelDraft.enabled && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('jobs.fuelGallons')}</label>
                  <input type="number" value={fuelDraft.gallons} min={0} step="0.001"
                    onChange={e => setFuelDraft(f => ({ ...f, gallons: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('jobs.fuelCpg')}</label>
                  <input type="number" value={fuelDraft.cpg} min={0} step="0.001"
                    onChange={e => setFuelDraft(f => ({ ...f, cpg: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('jobs.fuelOdometer')}</label>
                  <input type="number" value={fuelDraft.odometer} min={0}
                    onChange={e => setFuelDraft(f => ({ ...f, odometer: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('jobs.fuelTotal')}</label>
                  <div className="px-2 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded">
                    {fuelTotal !== '—' ? `$${fuelTotal}` : '—'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {t('jobs.fuelNote', { date: form.startDate })}
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            {editing ? t('common.save') : t('jobs.add')}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles for this file**

```bash
cd frontend
npx tsc --noEmit 2>&1 | grep JobModal
```

Expected: No errors for `JobModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/JobModal.tsx
git commit -m "feat: remove recurrence/endDate from JobModal, add prefill prop"
```

---

### Task 6: Update JobGroups page — template modal + Schedule button + amber dot

**Files:**
- Modify: `frontend/src/pages/JobGroups.tsx`

- [ ] **Step 1: Write the new `JobGroups.tsx`**

Replace `frontend/src/pages/JobGroups.tsx` with:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import JobModal from '../components/JobModal';
import type { Job, JobGroup } from '../types';

type FormState = Omit<JobGroup, 'id'>;

const blank: FormState = {
  name: '', type: 'route', description: '',
  customerId: null, vehicleId: null,
  defaultRevenue: 0, defaultDriverPayroll: 0,
  recurrence: 'one_time',
};

function suggestNextDate(group: JobGroup, jobs: Job[]): string {
  const today = new Date();
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  if (group.recurrence === 'one_time') return fmt(today);
  const groupJobs = jobs.filter(j => j.jobGroupId === group.id);
  const latestDate = groupJobs.map(j => j.startDate).sort().at(-1);
  if (!latestDate) return fmt(today);
  const [y, m, d] = latestDate.split('-').map(Number);
  const base = new Date(y, m - 1, d); // local time — avoids timezone boundary issues
  if (group.recurrence === 'daily')   base.setDate(base.getDate() + 1);
  if (group.recurrence === 'weekly')  base.setDate(base.getDate() + 7);
  if (group.recurrence === 'monthly') base.setMonth(base.getMonth() + 1);
  return fmt(base);
}

export default function JobGroups() {
  const { t } = useTranslation();
  const data = useData();
  const { jobGroups, jobs, vehicles, customers, addJobGroup, updateJobGroup, deleteJobGroup } = data;

  const today = new Date().toISOString().slice(0, 10);

  const [modal, setModal] = useState<{ open: boolean; editing: JobGroup | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; prefill: Partial<Omit<Job, 'id'>> | null }>({ open: false, prefill: null });

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(jg: JobGroup) {
    setForm({
      name: jg.name, type: jg.type, description: jg.description,
      customerId: jg.customerId, vehicleId: jg.vehicleId,
      defaultRevenue: jg.defaultRevenue, defaultDriverPayroll: jg.defaultDriverPayroll,
      recurrence: jg.recurrence,
    });
    setModal({ open: true, editing: jg });
  }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) updateJobGroup({ ...modal.editing, ...form });
    else addJobGroup(form);
    close();
  }

  function del(jg: JobGroup) {
    if (window.confirm(t('jobGroups.confirmDelete', { name: jg.name }))) deleteJobGroup(jg.id);
  }

  function openSchedule(jg: JobGroup) {
    const nextDate = suggestNextDate(jg, jobs);
    const prefill: Partial<Omit<Job, 'id'>> = {
      name: `${jg.name} — ${nextDate}`,
      jobGroupId: jg.id,
      startDate: nextDate,
      revenue: jg.defaultRevenue,
      driverPayroll: jg.defaultDriverPayroll,
      ...(jg.vehicleId != null ? { vehicleId: jg.vehicleId } : {}),
      ...(jg.customerId != null ? { customerId: jg.customerId } : {}),
    };
    setScheduleModal({ open: true, prefill });
  }

  const setF = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = ['customerId', 'vehicleId'].includes(field)
      ? (e.target.value === '' ? null : Number(e.target.value))
      : ['defaultRevenue', 'defaultDriverPayroll'].includes(field)
        ? Number(e.target.value)
        : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('jobGroups.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('jobGroups.subtitle')}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('jobGroups.add')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {jobGroups.map(jg => {
          const groupJobs = jobs
            .filter(j => j.jobGroupId === jg.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));
          const displayJobs = groupJobs.slice(0, 5);
          const hasJobToday = groupJobs.some(j => j.startDate === today && j.status === 'scheduled');
          return (
            <div key={jg.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {hasJobToday && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={t('jobGroups.scheduledToday')} />
                    )}
                    <span className="font-semibold text-slate-800">{jg.name}</span>
                    <Badge value={jg.type} />
                    <Badge value={jg.recurrence} />
                  </div>
                  {jg.description && <p className="text-sm text-slate-500">{jg.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {jg.defaultRevenue > 0 && `$${jg.defaultRevenue.toLocaleString()} / run`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(jg)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                  <button onClick={() => del(jg)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                </div>
              </div>

              <div className="border-t border-slate-100 px-4 py-2 flex-1">
                {groupJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">{t('jobGroups.noJobs')}</p>
                ) : (
                  <ul className="space-y-1">
                    {displayJobs.map(j => (
                      <li key={j.id} className="flex items-center justify-between text-sm gap-2">
                        <Link to={`/ops/jobs/${j.id}`} className="text-blue-600 hover:underline truncate">{j.name}</Link>
                        <Badge value={j.status} />
                      </li>
                    ))}
                    {groupJobs.length > 5 && (
                      <li className="text-xs text-slate-400 pt-1">
                        {t('common.more', { count: groupJobs.length - 5 })} — <Link to="/ops/jobs" className="text-blue-500 hover:underline">{t('common.viewAll')}</Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">{groupJobs.length} {t('sidebar.jobs').toLowerCase()}</span>
                <button
                  onClick={() => openSchedule(jg)}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  {t('jobGroups.schedule')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit/Add Job Group Modal */}
      {modal.open && (
        <Modal title={modal.editing ? t('jobGroups.editTitle') : t('jobGroups.addTitle')} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')} *</label>
              <input value={form.name} onChange={setF('name')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Shuttle Routes" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.type')}</label>
                <select value={form.type} onChange={setF('type')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="route">{t('jobGroups.typeRoute')}</option>
                  <option value="one_time">{t('jobGroups.typeOneTime')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.recurrence')}</label>
                <select value={form.recurrence} onChange={setF('recurrence')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="one_time">{t('jobs.recurrenceOneTime')}</option>
                  <option value="daily">{t('jobs.recurrenceDaily')}</option>
                  <option value="weekly">{t('jobs.recurrenceWeekly')}</option>
                  <option value="monthly">{t('jobs.recurrenceMonthly')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.customer')}</label>
              <select value={form.customerId ?? ''} onChange={setF('customerId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('jobs.select')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.vehicle')}</label>
              <select value={form.vehicleId ?? ''} onChange={setF('vehicleId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('jobs.select')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.defaultRevenue')}</label>
                <input type="number" value={form.defaultRevenue} onChange={setF('defaultRevenue')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.defaultDriverPayroll')}</label>
                <input type="number" value={form.defaultDriverPayroll} onChange={setF('defaultDriverPayroll')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.description')}</label>
              <textarea value={form.description} onChange={setF('description')}
                rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('jobGroups.add')}
              </button>
              <button onClick={close} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Next Run Modal */}
      {scheduleModal.open && scheduleModal.prefill && (
        <JobModal
          editing={null}
          prefill={scheduleModal.prefill}
          onClose={() => setScheduleModal({ open: false, prefill: null })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit 2>&1 | grep JobGroups
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/JobGroups.tsx
git commit -m "feat: job group template modal, schedule next run button, amber today dot"
```

---

### Task 7: Update Jobs page — amber today highlight

**Files:**
- Modify: `frontend/src/pages/Jobs.tsx`

- [ ] **Step 1: Update `Jobs.tsx`**

Replace `frontend/src/pages/Jobs.tsx` with:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import JobModal from '../components/JobModal';
import type { Job } from '../types';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Jobs() {
  const { t } = useTranslation();
  const { jobs, vehicles, drivers, customers, jobGroups, jobLineItems, deleteJob } = useData();
  const [modal, setModal] = useState<{ open: boolean; editing: Job | null }>({ open: false, editing: null });

  const today = new Date().toISOString().slice(0, 10);

  function del(j: Job) {
    if (window.confirm(t('jobs.confirmDelete', { name: j.name }))) deleteJob(j.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('jobs.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('jobs.subtitle', { count: jobs.length })}</p>
        </div>
        <button onClick={() => setModal({ open: true, editing: null })}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('jobs.add')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {[t('jobs.title'), t('jobs.jobGroup'), t('jobs.customer'), t('jobs.vehicle'), t('jobs.driver'), t('jobs.revenue'), t('common.status'), ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const vehicle = vehicles.find(v => v.id === job.vehicleId);
              const driver = job.driverId ? drivers.find(d => d.id === job.driverId) : null;
              const customer = customers.find(c => c.id === job.customerId);
              const jg = jobGroups.find(x => x.id === job.jobGroupId);
              const lineItemCount = jobLineItems.filter(li => li.jobId === job.id).length;
              const isToday = job.startDate === today && job.status === 'scheduled';
              return (
                <tr key={job.id} className={`border-b border-slate-100 ${isToday ? 'border-l-4 border-l-amber-400 bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link to={`/ops/jobs/${job.id}`} className="text-blue-600 hover:underline">{job.name}</Link>
                    {isToday && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        {t('jobGroups.scheduledToday')}
                      </span>
                    )}
                    {lineItemCount > 0 && <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{lineItemCount} {t('jobs.fees')}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {customer ? <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline">{customer.name}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {vehicle ? <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">{vehicle.year} {vehicle.make} {vehicle.model}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(job.revenue)}</td>
                  <td className="px-4 py-3"><Badge value={job.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, editing: job })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                      <button onClick={() => del(job)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <JobModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit 2>&1 | grep Jobs.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Jobs.tsx
git commit -m "feat: amber today highlight for scheduled jobs in Jobs list"
```

---

### Task 8: Update JobDetail page

**Files:**
- Modify: `frontend/src/pages/JobDetail.tsx`

- [ ] **Step 1: Update `JobDetail.tsx`**

Remove the `recurrence` and `end_date` display sections and rename "Start Date" to "Date". Replace the `<dl>` section inside the details card (lines 96–136) with:

```tsx
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.contactName')}</dt>
              <dd>
                {customer
                  ? <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline font-medium">{customer.name}</Link>
                  : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.vehicleLabel')}</dt>
              <dd>
                {vehicle
                  ? <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</Link>
                  : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.driverLabel')}</dt>
              <dd className="font-medium text-slate-700">{driver?.name ?? <span className="text-slate-400">{t('jobDetail.unassigned')}</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.dateLabel')}</dt>
              <dd className="text-slate-700">{job.startDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.statusLabel')}</dt>
              <dd><Badge value={job.status} /></dd>
            </div>
          </dl>
```

Also update the subtitle line (currently line 55):
```tsx
            <p className="text-sm text-slate-500 mt-1">
              {jobGroup?.name} · {job.startDate}
            </p>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit 2>&1 | grep JobDetail
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/JobDetail.tsx
git commit -m "feat: remove recurrence/end_date from JobDetail, rename to Date"
```

---

### Task 9: Update i18n translations

**Files:**
- Modify: `frontend/src/i18n/locales/en.ts`
- Modify: `frontend/src/i18n/locales/es.ts`
- Modify: `frontend/src/i18n/locales/zh.ts`

- [ ] **Step 1: Update `en.ts` — jobGroups section**

In `frontend/src/i18n/locales/en.ts`, replace the `jobGroups` block:

```typescript
  jobGroups: {
    title: 'Job Groups',
    subtitle: 'Route contracts and one-time job categories',
    add: '+ Add Job Group',
    addTitle: 'Add Job Group',
    editTitle: 'Edit Job Group',
    noJobs: 'No jobs',
    viewProfitability: 'View profitability →',
    typeRoute: 'Route (recurring)',
    typeOneTime: 'One-Time',
    confirmDelete: 'Delete "{{name}}"? This cannot be undone.',
    schedule: 'Schedule Next Run',
    scheduledToday: 'Today',
    recurrence: 'Recurrence',
    customer: 'Default Customer',
    vehicle: 'Default Vehicle',
    defaultRevenue: 'Default Revenue ($)',
    defaultDriverPayroll: 'Default Driver Payroll ($)',
  },
```

- [ ] **Step 2: Update `en.ts` — jobs section**

Replace the `jobs` block (remove recurrence-related keys, rename startDate → date, remove endDate):

```typescript
  jobs: {
    title: 'Jobs',
    subtitle: '{{count}} total jobs',
    add: '+ Add Job',
    addTitle: 'Add Job',
    editTitle: 'Edit Job',
    jobName: 'Job Name',
    jobNamePlaceholder: 'e.g. Airport Shuttle Route A',
    jobGroup: 'Job Group',
    customer: 'Customer',
    vehicle: 'Vehicle',
    driver: 'Driver',
    unassigned: '— unassigned —',
    select: '— select —',
    revenue: 'Revenue ($)',
    driverPayroll: 'Driver Payroll ($)',
    accountsReceivable: 'Accounts Receivable ($)',
    paymentsReceived: 'Payments Received ($)',
    recurrenceDaily: 'Daily',
    recurrenceWeekly: 'Weekly',
    recurrenceMonthly: 'Monthly',
    recurrenceOneTime: 'One-Time',
    date: 'Date',
    fees: 'fees',
    statusActive: 'Active',
    statusScheduled: 'Scheduled',
    statusCompleted: 'Completed',
    confirmDelete: 'Delete "{{name}}"?',
    feesSection: 'One-Time Fees & Reimbursements',
    feesNet: 'Net:',
    addFee: 'Add fee / reimbursement',
    feeDate: 'Date',
    feeCategory: 'Category',
    feeCategoryPlaceholder: 'Toll',
    feeType: 'Type',
    feeCost: 'Cost',
    feeIncome: 'Income',
    feeAmount: 'Amount ($)',
    feeNotes: 'Notes',
    fuelSection: 'Log fuel fill-up for this job',
    fuelGallons: 'Gallons',
    fuelCpg: 'Cost per Gallon ($)',
    fuelOdometer: 'Odometer',
    fuelTotal: 'Total (calculated)',
    fuelNote: 'Entry dated {{date}} will appear in the vehicle\'s Fuel tab.',
  },
```

- [ ] **Step 3: Update `en.ts` — jobDetail section**

Replace `recurrenceLabel`, `startDateLabel`, `endDateLabel` in the `jobDetail` block:

```typescript
    dateLabel: 'Date',
```

Remove `recurrenceLabel` and `endDateLabel` entries. Keep all other `jobDetail` keys.

- [ ] **Step 4: Mirror changes in `es.ts`**

In `frontend/src/i18n/locales/es.ts`:

Add to `jobGroups`:
```typescript
    schedule: 'Programar Próxima Ejecución',
    scheduledToday: 'Hoy',
    recurrence: 'Recurrencia',
    customer: 'Cliente Predeterminado',
    vehicle: 'Vehículo Predeterminado',
    defaultRevenue: 'Ingresos Predeterminados ($)',
    defaultDriverPayroll: 'Nómina Predeterminada del Conductor ($)',
```

In `jobs`: rename `startDate` → `date: 'Fecha'`, remove `endDate`, `recurrence`.

In `jobDetail`: rename `startDateLabel` → `dateLabel: 'Fecha'`, remove `recurrenceLabel`, `endDateLabel`.

- [ ] **Step 5: Mirror changes in `zh.ts`**

In `frontend/src/i18n/locales/zh.ts`:

Add to `jobGroups`:
```typescript
    schedule: '安排下次运行',
    scheduledToday: '今天',
    recurrence: '重复频率',
    customer: '默认客户',
    vehicle: '默认车辆',
    defaultRevenue: '默认收入 ($)',
    defaultDriverPayroll: '默认司机工资 ($)',
```

In `jobs`: rename `startDate` → `date: '日期'`, remove `endDate`, `recurrence`.

In `jobDetail`: rename `startDateLabel` → `dateLabel: '日期'`, remove `recurrenceLabel`, `endDateLabel`.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
cd frontend
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 7: Build to confirm no runtime issues**

```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/i18n/locales/en.ts frontend/src/i18n/locales/es.ts frontend/src/i18n/locales/zh.ts
git commit -m "feat: update i18n translations for job group template and date field rename"
```

---

## Deployment

After all tasks pass locally, deploy to Cloud Run + Firebase Hosting:

```bash
# Backend — rebuild and redeploy
gcloud builds submit backend \
  --tag us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --project project-4492076b-e4a4-4a4b-b5a
gcloud run deploy superbus-api \
  --image us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region us-central1 --project project-4492076b-e4a4-4a4b-b5a

# Frontend — build and deploy
cd frontend && npm run build
firebase deploy --only hosting --project project-4492076b-e4a4-4a4b-b5a
```
