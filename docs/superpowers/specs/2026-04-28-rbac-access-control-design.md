# Role-Based Access Control (RBAC) Design

## Overview

Add frontend role awareness so the UI respects each user's role: Admin, Investor, Manager, or Staff. The backend already enforces RBAC via `require_permission`. This spec adds a `/me` endpoint, stores the role in AuthContext, and gates UI elements accordingly.

## Permission Matrix

| Section      | Admin | Investor | Manager | Staff |
|-------------|-------|----------|---------|-------|
| Dashboard   | view+edit | view | view+edit | view |
| Operations  | view+edit | view | view+edit | view+edit |
| Master Data | view+edit | view | view+edit | view+edit |
| Profit Center | view+edit | view | view+edit | — |
| Reports     | view+edit | view | view+edit | — |
| Admin       | view+edit | — | — | — |

"Edit" means: add/edit/delete buttons visible, StatusSwitcher active.
"View" means: read-only, no mutation controls rendered.
"—" means: section not accessible, redirected to dashboard.

## Section 1 — Backend `/me` Endpoint

**File:** `backend/app/routers/users.py`

Add `GET /api/v1/users/me` that uses the existing `get_current_user` dependency. Returns the authenticated user's profile including their role name (joined from the `roles` table). No schema changes required.

**Response shape:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "roleId": 1,
  "roleName": "admin"
}
```

The route must be declared before any `/{id}` route to avoid path conflicts.

## Section 2 — AuthContext Role Fetch

**File:** `frontend/src/context/AuthContext.tsx`

After Firebase `onAuthStateChanged` fires with a non-null user, fetch `/api/v1/users/me` using `apiFetch` (which attaches the Firebase ID token). Store `appRole: AppRole | null` in state. Keep `loading: true` until both Firebase auth and the `/me` fetch resolve.

**Exported from `useAuth()`:**
- `user: FirebaseUser | null` (unchanged)
- `appRole: AppRole | null` (new)
- `loading: boolean` (already exists, now covers /me fetch too)
- `logout` (unchanged)

If `/me` fetch fails (network error or 401), set `appRole` to `null` and allow the login redirect to handle it.

## Section 3 — Permissions Helper

**File:** `frontend/src/lib/permissions.ts` (new file)

```ts
export type AppRole = 'admin' | 'investor' | 'manager' | 'staff';
export type Section = 'dashboard' | 'ops' | 'master' | 'profit' | 'reports' | 'admin';

const VIEW_MAP: Record<AppRole, Section[]> = {
  admin:    ['dashboard', 'ops', 'master', 'profit', 'reports', 'admin'],
  investor: ['dashboard', 'ops', 'master', 'profit', 'reports'],
  manager:  ['dashboard', 'ops', 'master', 'profit', 'reports'],
  staff:    ['dashboard', 'ops', 'master'],
};

const EDIT_MAP: Record<AppRole, Section[]> = {
  admin:    ['dashboard', 'ops', 'master', 'profit', 'reports', 'admin'],
  investor: [],
  manager:  ['dashboard', 'ops', 'master', 'profit', 'reports'],
  staff:    ['ops', 'master'],
};

export function canViewSection(role: AppRole | null, section: Section): boolean
export function canEdit(role: AppRole | null, section: Section): boolean
```

`null` role returns `false` for both functions (safe default — unauthenticated cannot access anything).

## Section 4 — Route Guarding

**File:** `frontend/src/App.tsx`

Add a `RoleRoute` wrapper component that:
1. Checks `loading` — renders null or a spinner while auth resolves
2. Checks `user` — redirects to `/login` if not authenticated
3. Checks `canViewSection(appRole, section)` — redirects to `/` if role lacks access

Apply `RoleRoute` to:
- `/profit/*` and `/reports/*` — blocked for Staff
- `/admin/*` — blocked for Investor, Manager, Staff

The existing `ProtectedRoute` (Firebase auth only) remains for sections all authenticated roles can view.

## Section 5 — TopNav Filtering

**File:** `frontend/src/components/TopNav.tsx`

Each entry in the `sections` array gets a `section: Section` field. Filter the array with `canViewSection(appRole, s.section)` before rendering. The nav automatically hides inaccessible sections without any new conditional logic.

## Section 6 — Per-Page Edit Controls

All pages with mutation controls conditionally render based on `canEdit(appRole, section)` from `useAuth()`.

**Affected files and their section:**
| File | Section |
|------|---------|
| `JobGroups.tsx` | `ops` |
| `JobDetail.tsx` (StatusSwitcher) | `ops` |
| `Drivers.tsx` | `ops` |
| `Customers.tsx` | `ops` |
| `Vehicles.tsx` | `master` |
| `VehicleDetail.tsx` | `master` |
| `GaExpenses.tsx` | `profit` |
| `Profitability.tsx` | `profit` |
| `PLReport.tsx` | `reports` |
| `Users.tsx` | `admin` |

Pattern per page:
```tsx
const { appRole } = useAuth();
const editable = canEdit(appRole, 'ops'); // or 'master', 'profit', etc.

// Conditionally render:
{editable && <button onClick={openAdd}>+ Add</button>}
{editable && <button onClick={() => openEdit(item)}>Edit</button>}
{editable && <button onClick={() => del(item)}>Delete</button>}
// For StatusSwitcher:
{editable
  ? <StatusSwitcher jobId={job.id} current={job.status} />
  : <Badge value={job.status} />}
```

## Non-Goals

- No granular per-record permissions (all-or-nothing per section)
- No permission management UI (roles assigned in Admin → Users)
- No backend permission changes (already enforced)
- No audit logging
