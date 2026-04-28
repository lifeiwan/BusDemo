# Job Group Template & Schedule Design

## Goal

Transform `JobGroup` into a reusable dispatch template. Each job is one occurrence (one run). A "Schedule next run" button pre-fills a new job from the group's template defaults and suggests the next date based on recurrence. Jobs scheduled for today are visually highlighted in amber.

## Architecture

`JobGroup` is the contract/template. `Job` is a single dispatch occurrence. The recurrence schedule lives on the group; individual jobs have no recurrence or end date. No automatic job creation — the dispatcher schedules one run at a time using the "Schedule next run" button.

## Data Model Changes

### `JobGroup` — add 5 template fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `customer_id` | `int \| null` | `null` | Default customer for new jobs |
| `vehicle_id` | `int \| null` | `null` | Default vehicle for new jobs |
| `default_revenue` | `float` | `0.0` | Typical per-run revenue |
| `default_driver_payroll` | `float` | `0.0` | Typical per-run driver cost |
| `recurrence` | `str` | `"one_time"` | `daily \| weekly \| monthly \| one_time` |

### `Job` — remove 2 fields

- `recurrence` — removed (belongs on group)
- `end_date` — removed (one occurrence = one date; `start_date` is the run date)

`start_date` is kept as-is and semantically becomes "the date of this dispatch".

## Backend Changes

### Schemas (`app/schemas/job.py`)

`JobGroupBase` adds:
```python
customer_id: Optional[int] = None
vehicle_id: Optional[int] = None
default_revenue: float = 0.0
default_driver_payroll: float = 0.0
recurrence: str = "one_time"
```

`JobBase` removes:
```python
recurrence: str   # deleted
end_date: ...     # deleted
```

### Model (`app/models/job.py`)

`JobGroup` adds 5 mapped columns matching the schema fields above.

`Job` drops `recurrence` and `end_date` columns.

### Migration (Alembic)

```sql
-- job_groups
ALTER TABLE job_groups ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE job_groups ADD COLUMN vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL;
ALTER TABLE job_groups ADD COLUMN default_revenue NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE job_groups ADD COLUMN default_driver_payroll NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE job_groups ADD COLUMN recurrence VARCHAR(20) NOT NULL DEFAULT 'one_time';

-- jobs
ALTER TABLE jobs DROP COLUMN recurrence;
ALTER TABLE jobs DROP COLUMN end_date;
```

### Router (`app/routers/jobs.py`)

No new endpoints. Existing CRUD for job-groups and jobs is sufficient. "Schedule next run" calls `POST /jobs/` with a pre-filled payload from the frontend.

## Frontend Changes

### Types (`src/types/index.ts`)

`JobGroup` adds:
```ts
customerId: number | null
vehicleId: number | null
defaultRevenue: number
defaultDriverPayroll: number
recurrence: 'daily' | 'weekly' | 'monthly' | 'one_time'
```

`Job` removes:
```ts
recurrence: string  // deleted
endDate: string     // deleted
```

### JobGroups page (`src/pages/JobGroups.tsx`)

**Modal** adds fields:
- Customer (select, optional)
- Vehicle (select, optional)
- Recurrence (select: One-time / Daily / Weekly / Monthly)
- Default Revenue (number input)
- Default Driver Payroll (number input)

**Card** changes:
- Amber dot in header if any job in the group has `startDate === today` and `status === 'scheduled'`
- "Schedule next run" button at card footer

**"Schedule next run" logic (frontend only):**
```ts
function suggestNextDate(group: JobGroup, jobs: Job[]): string {
  const groupJobs = jobs.filter(j => j.jobGroupId === group.id);
  const latest = groupJobs.map(j => j.startDate).sort().at(-1);
  const base = latest ? new Date(latest) : new Date();
  if (group.recurrence === 'daily')   base.setDate(base.getDate() + 1);
  if (group.recurrence === 'weekly')  base.setDate(base.getDate() + 7);
  if (group.recurrence === 'monthly') base.setMonth(base.getMonth() + 1);
  return base.toISOString().slice(0, 10);
}
```

Auto-generated job name: `"${group.name} — ${suggestedDate}"`

Opens `JobModal` pre-filled with name, customerId, vehicleId, revenue, driverPayroll from template. All fields remain editable before saving. Saves with `status = 'scheduled'`.

### JobModal component (`src/components/JobModal.tsx`)

- Remove `recurrence` field
- Remove `end date` field
- Single date picker labelled "Date" (was "Start Date")

### Jobs page (`src/pages/Jobs.tsx`)

- Remove Recurrence column from table
- Rows where `job.startDate === today && job.status === 'scheduled'` get:
  - Amber left border (`border-l-4 border-amber-400`)
  - `Today` pill badge next to job name (`bg-amber-100 text-amber-700`)

### JobDetail page (`src/pages/JobDetail.tsx`)

- Remove recurrence display
- Remove end date display
- Label "Start Date" → "Date"

## "Today" Visual Treatment

Condition: `job.startDate === new Date().toISOString().slice(0, 10) && job.status === 'scheduled'`

| Location | Treatment |
|---|---|
| Jobs list row | Amber left border + `Today` amber pill next to job name |
| JobGroup card header | Small amber dot if any job in group matches condition |

Amber palette: `border-amber-400`, `bg-amber-100`, `text-amber-700`

## Profit Math (unchanged)

Each job stores its actual `revenue`, `driverPayroll`, `paymentsReceived`. The report service sums jobs by group and by month. Template defaults do not affect reported figures — they only pre-fill the scheduling form.
