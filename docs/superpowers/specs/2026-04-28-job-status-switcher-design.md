# Job Status Switcher Design

**Goal:** Replace the static status badge on the JobDetail page with an interactive 3-segment pill that lets users change job status in-place with a single confirmation step.

**Architecture:** Pure frontend change — a new `StatusSwitcher` component on JobDetail, plus a `patchJobStatus` helper in DataContext that sends a lightweight PATCH (status only) to the existing jobs API endpoint.

**Tech Stack:** React + TypeScript, Tailwind CSS, existing DataContext/apiFetch pattern.

---

## Scope

- **Only JobDetail page** (`src/pages/JobDetail.tsx`)
- Badge component and Jobs list page are unchanged

---

## Components

### `StatusSwitcher` (`src/components/StatusSwitcher.tsx`)

A self-contained component that renders the 3-segment pill and manages pending/confirmation state locally.

**Props:**
```ts
interface Props {
  jobId: number;
  current: 'scheduled' | 'active' | 'completed';
}
```

**Visual states:**
- Each segment label: `Scheduled | Active | Completed`
- Current status segment: filled, color-coded
  - `scheduled` → amber fill (`bg-amber-100 text-amber-700 border-amber-300`)
  - `active` → green fill (`bg-green-100 text-green-700 border-green-300`)
  - `completed` → slate fill (`bg-slate-100 text-slate-600 border-slate-300`)
- Unselected segments: ghost (white bg, slate border, slate text, hover highlight)
- Pending selection (user clicked but not confirmed): highlighted with dashed border

**Interaction flow:**
1. User clicks a different segment → local `pending` state set to that status; confirm row appears below
2. Confirm row: `"Change status to [Status]?" [Confirm] [Cancel]`
3. Confirm → calls `patchJobStatus(jobId, pending)` → on success, confirm row disappears, pill reflects new status
4. Cancel → `pending` reset to null, pill snaps back to current
5. Clicking the already-active segment → no-op

**Loading state:** Confirm button shows "Saving…" and is disabled while the API call is in flight.

**Error state:** If PATCH fails, show a small inline error message ("Failed to save — try again") and keep the confirm row open.

---

## DataContext change

Add `patchJobStatus(id: number, status: string): Promise<void>` to DataContext.

Implementation:
```ts
async function patchJobStatus(id: number, status: string) {
  await apiFetch(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
}
```

The existing backend `PATCH /api/v1/jobs/{id}` endpoint accepts partial updates, so no backend change is needed.

---

## JobDetail change

In `src/pages/JobDetail.tsx`, replace:
```tsx
<Badge value={job.status} />
```
with:
```tsx
<StatusSwitcher jobId={job.id} current={job.status as 'scheduled' | 'active' | 'completed'} />
```

The `<Badge>` in the details card (`dl` section, line ~122) is also replaced with `<StatusSwitcher>`.

---

## i18n

Add keys to all three locale files (`en.ts`, `es.ts`, `zh.ts`) under a `statusSwitcher` namespace:
```ts
statusSwitcher: {
  confirmPrompt: 'Change status to {{status}}?',
  confirm: 'Confirm',
  cancel: 'Cancel',
  saving: 'Saving…',
  error: 'Failed to save — try again',
}
```

---

## Testing

Manual test cases:
1. Open a `scheduled` job detail → all 3 segments visible, `Scheduled` is filled amber
2. Click `Active` → confirm row appears with correct label
3. Click Cancel → pill reverts, confirm row gone
4. Click `Active` → click Confirm → pill updates to green `Active`, confirm row gone
5. Refresh page → status persists (backend saved)
6. Click the already-active segment → nothing happens
