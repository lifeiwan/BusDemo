# Job Status Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static status badge on the JobDetail page with an interactive 3-segment pill that lets users change job status in-place with a single confirmation step.

**Architecture:** A new `StatusSwitcher` component manages local pending/saving/error state and calls a new `patchJobStatus` method on DataContext, which sends a full PUT to the existing `/api/v1/jobs/{id}` endpoint (no backend changes). JobDetail replaces both Badge instances with StatusSwitcher.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, react-i18next, existing `apiFetch` / DataContext pattern.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/i18n/locales/en.ts` | Add `statusSwitcher` key group |
| `frontend/src/i18n/locales/es.ts` | Add `statusSwitcher` key group (Spanish) |
| `frontend/src/i18n/locales/zh.ts` | Add `statusSwitcher` key group (Chinese) |
| `frontend/src/context/DataContext.tsx` | Add `patchJobStatus` to interface + value |
| `frontend/src/components/StatusSwitcher.tsx` | Create new component |
| `frontend/src/pages/JobDetail.tsx` | Replace two Badge usages with StatusSwitcher |

---

### Task 1: Add i18n translation keys

**Files:**
- Modify: `frontend/src/i18n/locales/en.ts`
- Modify: `frontend/src/i18n/locales/es.ts`
- Modify: `frontend/src/i18n/locales/zh.ts`

- [ ] **Step 1: Add keys to en.ts**

In `frontend/src/i18n/locales/en.ts`, insert before the final `} as const;`:

```ts
  statusSwitcher: {
    confirmPrompt: 'Change status to {{status}}?',
    confirm: 'Confirm',
    cancel: 'Cancel',
    saving: 'Saving…',
    error: 'Failed to save — try again',
  },
```

- [ ] **Step 2: Add keys to es.ts**

In `frontend/src/i18n/locales/es.ts`, insert before the final `} as const;`:

```ts
  statusSwitcher: {
    confirmPrompt: '¿Cambiar estado a {{status}}?',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    saving: 'Guardando…',
    error: 'Error al guardar — intente de nuevo',
  },
```

- [ ] **Step 3: Add keys to zh.ts**

In `frontend/src/i18n/locales/zh.ts`, insert before the final `} as const;`:

```ts
  statusSwitcher: {
    confirmPrompt: '将状态更改为{{status}}？',
    confirm: '确认',
    cancel: '取消',
    saving: '保存中…',
    error: '保存失败 — 请重试',
  },
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/locales/en.ts frontend/src/i18n/locales/es.ts frontend/src/i18n/locales/zh.ts
git commit -m "feat: add statusSwitcher i18n keys"
```

---

### Task 2: Add patchJobStatus to DataContext

**Files:**
- Modify: `frontend/src/context/DataContext.tsx:31-33` (interface) and `~205-212` (value object)

The existing `updateJob` uses PUT but requires a full Job object. `patchJobStatus` is a focused helper that looks up the full job from state, merges the new status, and sends PUT. It does NOT use the `run` helper so it can throw — this lets StatusSwitcher catch errors and show inline feedback.

- [ ] **Step 1: Add method to DataContextValue interface**

In `frontend/src/context/DataContext.tsx`, find the Jobs section of the `DataContextValue` interface (around line 31–33):

```ts
  // Jobs
  addJob: (j: Omit<Job, 'id'>) => void;
  updateJob: (j: Job) => void;
  deleteJob: (id: number) => void;
```

Replace with:

```ts
  // Jobs
  addJob: (j: Omit<Job, 'id'>) => void;
  updateJob: (j: Job) => void;
  deleteJob: (id: number) => void;
  patchJobStatus: (id: number, status: string) => Promise<void>;
```

- [ ] **Step 2: Add implementation to the value object**

In `frontend/src/context/DataContext.tsx`, find the Jobs section of the `value` object (around line 200–212):

```ts
    // Jobs
    addJob: async (j) => run(
      () => apiFetch<Job>('/api/v1/jobs/', { method: 'POST', body: JSON.stringify(j) }),
      (c) => setJobs(prev => [...prev, c])
    ),
    updateJob: async (j) => run(
      () => apiFetch<Job>(`/api/v1/jobs/${j.id}`, { method: 'PUT', body: JSON.stringify(j) }),
      (u) => setJobs(prev => prev.map(x => x.id === j.id ? u : x))
    ),
    deleteJob: async (id) => run(
      () => apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' }),
      () => setJobs(prev => prev.filter(x => x.id !== id))
    ),
```

Replace with:

```ts
    // Jobs
    addJob: async (j) => run(
      () => apiFetch<Job>('/api/v1/jobs/', { method: 'POST', body: JSON.stringify(j) }),
      (c) => setJobs(prev => [...prev, c])
    ),
    updateJob: async (j) => run(
      () => apiFetch<Job>(`/api/v1/jobs/${j.id}`, { method: 'PUT', body: JSON.stringify(j) }),
      (u) => setJobs(prev => prev.map(x => x.id === j.id ? u : x))
    ),
    deleteJob: async (id) => run(
      () => apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' }),
      () => setJobs(prev => prev.filter(x => x.id !== id))
    ),
    patchJobStatus: async (id: number, status: string) => {
      const job = jobs.find(j => j.id === id);
      if (!job) return;
      const updated = await apiFetch<Job>(`/api/v1/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...job, status }),
      });
      setJobs(prev => prev.map(x => x.id === id ? updated : x));
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/DataContext.tsx
git commit -m "feat: add patchJobStatus to DataContext"
```

---

### Task 3: Create StatusSwitcher component

**Files:**
- Create: `frontend/src/components/StatusSwitcher.tsx`

The component renders a 3-segment pill (Scheduled | Active | Completed). Clicking a non-current segment sets `pending` state and shows a confirm row below. Confirming calls `patchJobStatus`, which throws on API failure — the component catches this and shows an inline error.

- [ ] **Step 1: Create the file**

Create `frontend/src/components/StatusSwitcher.tsx` with this content:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';

type Status = 'scheduled' | 'active' | 'completed';

const STATUSES: Status[] = ['scheduled', 'active', 'completed'];

const activeStyle: Record<Status, string> = {
  scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
  active:    'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ghostHover: Record<Status, string> = {
  scheduled: 'hover:bg-amber-50 hover:text-amber-700',
  active:    'hover:bg-green-50 hover:text-green-700',
  completed: 'hover:bg-slate-50 hover:text-slate-600',
};

interface Props {
  jobId: number;
  current: Status;
}

export default function StatusSwitcher({ jobId, current }: Props) {
  const { t } = useTranslation();
  const { patchJobStatus } = useData();
  const [pending, setPending] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayed = pending ?? current;

  async function handleConfirm() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await patchJobStatus(jobId, pending);
      setPending(null);
    } catch {
      setError(t('statusSwitcher.error'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPending(null);
    setError(null);
  }

  function handleSegmentClick(s: Status) {
    if (s === current || saving) return;
    setPending(s);
    setError(null);
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
        {STATUSES.map(s => {
          const isDisplayed = s === displayed;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleSegmentClick(s)}
              disabled={saving}
              className={[
                'px-3 py-1.5 border-r border-slate-200 last:border-r-0 transition-colors',
                isDisplayed
                  ? activeStyle[s]
                  : `bg-white text-slate-400 ${ghostHover[s]}`,
                saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {t(`status.${s}`)}
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">
            {t('statusSwitcher.confirmPrompt', { status: t(`status.${pending}`) })}
          </span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-60 transition-colors"
          >
            {saving ? t('statusSwitcher.saving') : t('statusSwitcher.confirm')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-2 py-0.5 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            {t('statusSwitcher.cancel')}
          </button>
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StatusSwitcher.tsx
git commit -m "feat: add StatusSwitcher component"
```

---

### Task 4: Wire StatusSwitcher into JobDetail

**Files:**
- Modify: `frontend/src/pages/JobDetail.tsx`

Replace both `<Badge value={job.status} />` usages with `<StatusSwitcher>`. Remove the `Badge` import (it's only used for `job.status` in this file). Add the `StatusSwitcher` import.

- [ ] **Step 1: Update imports**

In `frontend/src/pages/JobDetail.tsx`, find:

```tsx
import Badge from '../components/Badge';
import JobModal from '../components/JobModal';
```

Replace with:

```tsx
import JobModal from '../components/JobModal';
import StatusSwitcher from '../components/StatusSwitcher';
```

- [ ] **Step 2: Replace Badge in the header**

Find (around line 58–60):

```tsx
          <div className="flex items-center gap-2">
            <Badge value={job.status} />
            <button onClick={() => setEditing(true)}
```

Replace with:

```tsx
          <div className="flex items-center gap-2">
            <StatusSwitcher jobId={job.id} current={job.status as 'scheduled' | 'active' | 'completed'} />
            <button onClick={() => setEditing(true)}
```

- [ ] **Step 3: Replace Badge in the details card**

Find (around line 121–123):

```tsx
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.statusLabel')}</dt>
              <dd><Badge value={job.status} /></dd>
            </div>
```

Replace with:

```tsx
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.statusLabel')}</dt>
              <dd><StatusSwitcher jobId={job.id} current={job.status as 'scheduled' | 'active' | 'completed'} /></dd>
            </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

Start the dev server:
```bash
cd frontend && npm run dev
```

Open a job detail page (e.g. `/ops/jobs/1`) and verify:
1. Three-segment pill shows current status highlighted
2. Clicking a different segment shows the confirm row with correct label
3. Clicking Cancel reverts the pill, hides the confirm row
4. Clicking Confirm shows "Saving…", then updates the pill to new status
5. Refreshing the page shows the new status (confirms backend saved)
6. Clicking the already-active segment does nothing

- [ ] **Step 6: Build**

```bash
cd frontend && npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/JobDetail.tsx
git commit -m "feat: replace status badge with StatusSwitcher on JobDetail"
```
