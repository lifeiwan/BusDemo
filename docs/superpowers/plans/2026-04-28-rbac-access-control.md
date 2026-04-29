# RBAC Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-based UI access control so Admins can edit everything, Investors are read-only, Managers can edit non-admin sections, and Staff can only view/edit Ops + Master Data.

**Architecture:** A backend `/me` endpoint returns the user's role name; AuthContext fetches it after Firebase login and stores `appRole`; a permissions helper provides `canViewSection`/`canEdit` functions used by App.tsx route guards, TopNav, and all pages with mutation controls.

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + TypeScript + Tailwind + react-i18next (frontend), Firebase Auth (token source)

---

## File Map

**Create:**
- `frontend/src/lib/permissions.ts` — `AppRole`, `Section` types + `canViewSection` / `canEdit` functions

**Modify:**
- `backend/app/schemas/user.py` — add `UserMeRead` schema
- `backend/app/routers/users.py` — add `GET /users/me` endpoint
- `frontend/src/context/AuthContext.tsx` — add `appRole` state + `/me` fetch
- `frontend/src/App.tsx` — add `RoleRoute`, apply to `/profit`, `/reports`, `/admin`
- `frontend/src/components/TopNav.tsx` — filter nav sections by role
- `frontend/src/pages/JobGroups.tsx` — hide add/edit/delete for non-editors
- `frontend/src/pages/JobDetail.tsx` — StatusSwitcher → Badge for non-editors
- `frontend/src/pages/Drivers.tsx` — hide add/edit/delete for non-editors
- `frontend/src/pages/Customers.tsx` — hide add/edit/delete for non-editors
- `frontend/src/pages/Vehicles.tsx` — hide add/edit/delete for non-editors
- `frontend/src/pages/VehicleDetail.tsx` — hide add maintenance/fuel/fix for non-editors
- `frontend/src/pages/GaExpenses.tsx` — hide add/edit/delete for non-editors
- `frontend/src/pages/Users.tsx` — hide Add User button + remove/role-change for non-admins

---

## Task 1: Backend `/me` Endpoint

**Files:**
- Modify: `backend/app/schemas/user.py`
- Modify: `backend/app/routers/users.py`

- [ ] **Step 1: Add `UserMeRead` schema**

Open `backend/app/schemas/user.py`. Add after the existing `UserRead` class:

```python
class UserMeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role_id: int
    role_name: str
```

The file should now look like this in full:

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    name: str
    description: str = ""


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class RoleRead(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    firebase_uid: str
    email: str
    name: str = ""
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    pass


class UserUpdate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime


class UserMeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role_id: int
    role_name: str
```

- [ ] **Step 2: Add the `/me` route to `users_router`**

Open `backend/app/routers/users.py`. 

First, add `UserMeRead` to the import line:

```python
from app.schemas.user import (
    RoleCreate, RoleRead, RoleUpdate,
    UserCreate, UserRead, UserUpdate,
    UserMeRead,
)
```

Then add `get_current_user` to the auth middleware import (it's in `auth.py`):

```python
from app.middleware.auth import require_permission, get_current_user
```

Then add the `/me` endpoint **before** the existing `@users_router.get("/", ...)` block — it must come before `/{user_id}` to avoid route conflicts. Insert it right after the `# ── Users ──` comment line:

```python
# ── Users ─────────────────────────────────────────────────────────────────────

@users_router.get("/me", response_model=UserMeRead)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role  # loaded via SQLAlchemy relationship
    return UserMeRead(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role_id=current_user.role_id,
        role_name=role.name,
    )
```

The full `users_router` section of `backend/app/routers/users.py` should now read:

```python
# ── Users ─────────────────────────────────────────────────────────────────────

@users_router.get("/me", response_model=UserMeRead)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role
    return UserMeRead(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role_id=current_user.role_id,
        role_name=role.name,
    )


@users_router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return db.query(User).filter(User.company_id == current_user.company_id).all()


@users_router.post("/", response_model=UserRead, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = User(company_id=current_user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return _get_user_or_404(db, user_id, current_user.company_id)


@users_router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    db.delete(obj)
    db.commit()
```

- [ ] **Step 3: Verify endpoint manually**

Start the backend locally (or use the deployed URL). Run:

```bash
# Get a Firebase ID token first (from the browser devtools → Application → Firebase auth)
TOKEN="<your-firebase-id-token>"
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<your-cloud-run-url>/api/v1/users/me | python3 -m json.tool
```

Expected output (role_name will match the DB role for the account):
```json
{
  "id": 1,
  "email": "tech.superbus101@gmail.com",
  "name": "System Admin",
  "role_id": 1,
  "role_name": "admin"
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add backend/app/schemas/user.py backend/app/routers/users.py
git commit -m "feat: add GET /api/v1/users/me endpoint returning role name"
```

---

## Task 2: Permissions Helper

**Files:**
- Create: `frontend/src/lib/permissions.ts`

- [ ] **Step 1: Create the file**

```typescript
// frontend/src/lib/permissions.ts

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

export function canViewSection(role: AppRole | null, section: Section): boolean {
  if (!role) return false;
  return VIEW_MAP[role].includes(section);
}

export function canEdit(role: AppRole | null, section: Section): boolean {
  if (!role) return false;
  return EDIT_MAP[role].includes(section);
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `permissions.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/permissions.ts
git commit -m "feat: add permissions helper with canViewSection/canEdit"
```

---

## Task 3: AuthContext Role Fetch

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Rewrite `AuthContext.tsx`**

Replace the entire file contents with:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';
import { apiFetch } from '../lib/api';
import type { AppRole } from '../lib/permissions';

interface AuthContextValue {
  user: User | null;
  appRole: AppRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const me = await apiFetch<{ roleName: string }>('/api/v1/users/me');
          setAppRole(me.roleName as AppRole);
        } catch {
          setAppRole(null);
        }
      } else {
        setAppRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout(): Promise<void> {
    await signOut(auth);
    setAppRole(null);
  }

  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, appRole, loading, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "feat: fetch /me after login and store appRole in AuthContext"
```

---

## Task 4: Route Guards + TopNav Filtering

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/TopNav.tsx`

- [ ] **Step 1: Update `App.tsx` with `RoleRoute`**

Replace the entire `frontend/src/App.tsx` with:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canViewSection } from './lib/permissions';
import type { Section } from './lib/permissions';
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
import JobDetail from './pages/JobDetail';
import GaExpenses from './pages/GaExpenses';
import Reports from './pages/Reports';
import VehicleReport from './pages/VehicleReport';
import JobGroupReport from './pages/JobGroupReport';
import Users from './pages/Users';
import Login from './pages/Login';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ children, section }: { children: ReactNode; section: Section }) {
  const { user, appRole, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewSection(appRole, section)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <DataProvider>
            <div className="flex flex-col h-screen bg-slate-100">
              <TopNav />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/ops/job-groups" element={<JobGroups />} />
                    <Route path="/ops/jobs" element={<Jobs />} />
                    <Route path="/ops/jobs/:id" element={<JobDetail />} />
                    <Route path="/master/vehicles" element={<Vehicles />} />
                    <Route path="/master/vehicles/:id" element={<VehicleDetail />} />
                    <Route path="/master/customers" element={<Customers />} />
                    <Route path="/master/customers/:id" element={<CustomerDetail />} />
                    <Route path="/master/drivers" element={<Drivers />} />
                    <Route path="/master/ga-expenses" element={
                      <RoleRoute section="profit"><GaExpenses /></RoleRoute>
                    } />
                    <Route path="/profit/profitability" element={
                      <RoleRoute section="profit"><Profitability /></RoleRoute>
                    } />
                    <Route path="/reports/pl" element={
                      <RoleRoute section="reports"><Reports /></RoleRoute>
                    } />
                    <Route path="/reports/vehicle" element={
                      <RoleRoute section="reports"><VehicleReport /></RoleRoute>
                    } />
                    <Route path="/reports/job-group" element={
                      <RoleRoute section="reports"><JobGroupReport /></RoleRoute>
                    } />
                    <Route path="/admin/users" element={
                      <RoleRoute section="admin"><Users /></RoleRoute>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          </DataProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
```

Note: `dashboard`, `ops`, and `master` routes are NOT wrapped in `RoleRoute` because all authenticated roles can view them. Only `profit`, `reports`, and `admin` are restricted.

- [ ] **Step 2: Update `TopNav.tsx` to filter sections by role**

Replace the entire `frontend/src/components/TopNav.tsx` with:

```typescript
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { canViewSection } from '../lib/permissions';
import type { Section } from '../lib/permissions';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
  { code: 'es', label: 'ES' },
];

export default function TopNav() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const { logout, appRole } = useAuth();
  const navigate = useNavigate();

  const allSections: { label: string; path: string; prefix: string; section: Section }[] = [
    { label: t('nav.dashboard'),    path: '/',                    prefix: '',        section: 'dashboard' },
    { label: t('nav.operations'),   path: '/ops/job-groups',      prefix: '/ops',    section: 'ops' },
    { label: t('nav.masterData'),   path: '/master/vehicles',     prefix: '/master', section: 'master' },
    { label: t('nav.profitCenter'), path: '/profit/profitability',prefix: '/profit', section: 'profit' },
    { label: t('nav.reports'),      path: '/reports/pl',          prefix: '/reports',section: 'reports' },
    { label: t('nav.admin'),        path: '/admin/users',         prefix: '/admin',  section: 'admin' },
  ];

  const sections = allSections.filter(s => canViewSection(appRole, s.section));

  function isActive(prefix: string) {
    if (prefix === '') return pathname === '/';
    return pathname.startsWith(prefix);
  }

  return (
    <header className="bg-slate-800 text-white flex items-center px-6 h-14 shrink-0 gap-8 shadow-md z-10">
      <span className="font-bold text-lg tracking-tight select-none">
        Super<span className="text-blue-400">Bus</span>
      </span>
      <nav className="flex gap-1 flex-1">
        {sections.map(s => (
          <Link
            key={s.path}
            to={s.path}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isActive(s.prefix)
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      {/* Language switcher */}
      <div className="flex gap-1">
        {LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              i18n.resolvedLanguage === lang.code
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => { logout().then(() => navigate('/login', { replace: true })); }}
        className="ml-2 px-3 py-1.5 rounded text-xs font-semibold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
      >
        {t('login.logout')}
      </button>
    </header>
  );
}
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/TopNav.tsx
git commit -m "feat: add RoleRoute guard and filter TopNav sections by role"
```

---

## Task 5: Hide Edit Controls — Ops Pages

**Files:**
- Modify: `frontend/src/pages/JobGroups.tsx`
- Modify: `frontend/src/pages/JobDetail.tsx`
- Modify: `frontend/src/pages/Drivers.tsx`
- Modify: `frontend/src/pages/Customers.tsx`

For each file the pattern is:
1. Add `import { canEdit } from '../lib/permissions';` 
2. Add `const { appRole } = useAuth();` inside the component
3. Add `const editable = canEdit(appRole, 'ops');`
4. Wrap add/edit/delete/status buttons in `{editable && ...}`

- [ ] **Step 1: Update `JobGroups.tsx`**

Add these imports at the top of `frontend/src/pages/JobGroups.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `JobGroups` component function, after the existing `const { t } = useTranslation();` line, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'ops');
```

Then find every add/edit/delete button and the JobModal trigger. Wrap them with `{editable && ...}`.

The "+ Add Job Group" button (currently something like):
```tsx
<button onClick={openAdd} className="...">
  {t('jobGroups.add')}
</button>
```
Becomes:
```tsx
{editable && (
  <button onClick={openAdd} className="...">
    {t('jobGroups.add')}
  </button>
)}
```

The edit (✎) and delete (✕) icon buttons in each row:
```tsx
{editable && (
  <div className="flex gap-1">
    <button onClick={() => openEdit(g)} ...>✎</button>
    <button onClick={() => del(g)} ...>✕</button>
  </div>
)}
```

The "+ Add Job" button inside each group (the JobModal trigger):
```tsx
{editable && (
  <button onClick={() => openJobAdd(g)} ...>
    {t('jobGroups.addJob')}
  </button>
)}
```

Also wrap the job row's edit/delete buttons:
```tsx
{editable && (
  <div className="flex gap-1">
    <button onClick={() => openJobEdit(job)} ...>✎</button>
    <button onClick={() => delJob(job)} ...>✕</button>
  </div>
)}
```

The `{modal.open && <Modal ...>}` and `{jobModal.open && <JobModal ...>}` blocks remain — they only appear when `editable` triggers `openAdd`/`openEdit`, so they can stay unconditional.

- [ ] **Step 2: Update `JobDetail.tsx`**

Add these imports at the top of `frontend/src/pages/JobDetail.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
import Badge from '../components/Badge';
```

(`Badge` is already likely imported or needs to be re-added since StatusSwitcher replaced it in a prior session — verify and add only if missing.)

Inside the `JobDetail` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'ops');
```

Find all occurrences of `<StatusSwitcher ... />` and replace with:

```tsx
{editable
  ? <StatusSwitcher jobId={job.id} current={job.status as 'scheduled' | 'active' | 'completed'} />
  : <Badge value={job.status} />
}
```

Find the Edit Job button (opens the job modal) and wrap it:

```tsx
{editable && (
  <button onClick={openEdit} className="...">
    {t('common.edit')}
  </button>
)}
```

- [ ] **Step 3: Update `Drivers.tsx`**

Add these imports at the top of `frontend/src/pages/Drivers.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `Drivers` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'ops');
```

Wrap the "+ Add Driver" button:

```tsx
{editable && (
  <button onClick={openAdd} className="...">
    {t('drivers.add')}
  </button>
)}
```

Wrap the edit/delete icon buttons in each row:

```tsx
{editable && (
  <div className="flex gap-1">
    <button onClick={() => openEdit(d)} ...>✎</button>
    <button onClick={() => del(d)} ...>✕</button>
  </div>
)}
```

- [ ] **Step 4: Update `Customers.tsx`**

Add these imports at the top of `frontend/src/pages/Customers.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `Customers` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'ops');
```

Wrap the "+ Add Customer" button:

```tsx
{editable && (
  <button onClick={openAdd} className="...">
    {t('customers.add')}
  </button>
)}
```

Wrap the edit/delete icon buttons in each row:

```tsx
{editable && (
  <div className="flex gap-1">
    <button onClick={() => openEdit(c)} ...>✎</button>
    <button onClick={() => del(c)} ...>✕</button>
  </div>
)}
```

- [ ] **Step 5: Verify type-check**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/JobGroups.tsx frontend/src/pages/JobDetail.tsx \
        frontend/src/pages/Drivers.tsx frontend/src/pages/Customers.tsx
git commit -m "feat: hide ops edit controls for non-editor roles"
```

---

## Task 6: Hide Edit Controls — Master Data Pages

**Files:**
- Modify: `frontend/src/pages/Vehicles.tsx`
- Modify: `frontend/src/pages/VehicleDetail.tsx`

- [ ] **Step 1: Update `Vehicles.tsx`**

Add these imports at the top of `frontend/src/pages/Vehicles.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `Vehicles` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'master');
```

Wrap the "+ Add Vehicle" button:

```tsx
{editable && (
  <button onClick={openAdd} className="...">
    {t('vehicles.add')}
  </button>
)}
```

Wrap the edit/delete icon buttons in each row:

```tsx
{editable && (
  <div className="flex gap-1">
    <button onClick={() => openEdit(v)} ...>✎</button>
    <button onClick={() => del(v)} ...>✕</button>
  </div>
)}
```

- [ ] **Step 2: Update `VehicleDetail.tsx`**

Add these imports at the top of `frontend/src/pages/VehicleDetail.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `VehicleDetail` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'master');
```

Wrap the "Add Maintenance" button:

```tsx
{editable && (
  <button onClick={openAddMaintenance} className="...">
    {t('vehicleDetail.addMaintenance')}
  </button>
)}
```

Wrap the "Add Fuel" button:

```tsx
{editable && (
  <button onClick={openAddFuel} className="...">
    {t('vehicleDetail.addFuel')}
  </button>
)}
```

Wrap the "Add Fix" (or equivalent) button:

```tsx
{editable && (
  <button onClick={openAddFix} className="...">
    ...
  </button>
)}
```

Wrap the edit/delete buttons within each maintenance, fuel, and fix row similarly with `{editable && ...}`.

- [ ] **Step 3: Verify type-check**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Vehicles.tsx frontend/src/pages/VehicleDetail.tsx
git commit -m "feat: hide master data edit controls for non-editor roles"
```

---

## Task 7: Hide Edit Controls — Profit & Admin Pages

**Files:**
- Modify: `frontend/src/pages/GaExpenses.tsx`
- Modify: `frontend/src/pages/Users.tsx`

- [ ] **Step 1: Update `GaExpenses.tsx`**

Add these imports at the top of `frontend/src/pages/GaExpenses.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `GaExpenses` component, after the existing hooks, add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'profit');
```

Wrap the "+ Add Expense" button:

```tsx
{editable && (
  <button onClick={openAdd} className="...">
    {t('gaExpenses.add')}
  </button>
)}
```

Wrap the edit/delete buttons in the entries table rows:

```tsx
{editable && (
  <div className="flex gap-2 justify-center">
    <button onClick={() => openEdit(entry)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button>
    <button onClick={() => del(entry)} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>
  </div>
)}
```

If there is no editable `Actions` column needed for read-only users, you can also conditionally render the `Actions` table header:

```tsx
{editable && (
  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.actions')}</th>
)}
```

And in the row:

```tsx
{editable && (
  <td className="px-4 py-3">
    <div className="flex gap-2 justify-center">
      <button onClick={() => openEdit(entry)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button>
      <button onClick={() => del(entry)} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>
    </div>
  </td>
)}
```

- [ ] **Step 2: Update `Users.tsx`**

The `Users.tsx` page already has a hardcoded guard for `SYSTEM_ADMIN_EMAIL`. The `admin` section is already route-guarded (only admins reach this page). However, to be safe, add the `canEdit` guard pattern for future-proofing:

Add these imports at the top of `frontend/src/pages/Users.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
```

Inside the `Users` component, after the existing hooks (`useState`, `useEffect`), add:

```typescript
const { appRole } = useAuth();
const editable = canEdit(appRole, 'admin');
```

Wrap the "+ Add User" button:

```tsx
{editable && (
  <button
    onClick={() => setShowForm(!showForm)}
    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
  >
    {showForm ? 'Cancel' : '+ Add User'}
  </button>
)}
```

The existing non-system-admin role dropdown and Remove button are already conditionally rendered based on `isSystemAdmin`. They remain. No extra wrapping needed since the entire page is admin-only via `RoleRoute`.

- [ ] **Step 3: Verify type-check**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/GaExpenses.tsx frontend/src/pages/Users.tsx
git commit -m "feat: hide profit/admin edit controls for non-editor roles"
```

---

## Task 8: Build + Deploy

- [ ] **Step 1: Build frontend**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm run build 2>&1 | tail -20
```

Expected: `✓ built in X.Xs` with no errors.

- [ ] **Step 2: Deploy frontend**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx firebase deploy --only hosting
```

Expected: `Deploy complete!` with hosting URL.

- [ ] **Step 3: Build + push backend Docker image**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
docker build --platform linux/amd64 -t gcr.io/superbus-demo/superbus-backend:latest .
docker push gcr.io/superbus-demo/superbus-backend:latest
```

Expected: push completes successfully.

- [ ] **Step 4: Deploy backend to Cloud Run**

```bash
gcloud run deploy superbus-backend \
  --image gcr.io/superbus-demo/superbus-backend:latest \
  --region us-central1 \
  --project superbus-demo
```

Expected: `Service [superbus-backend] revision [...] has been deployed`.

- [ ] **Step 5: Smoke test RBAC**

Log in as each role and verify:
- **admin** (`tech.superbus101@gmail.com`): all 6 nav sections visible, edit buttons present everywhere
- **investor** (`evaadmin@gmail.com` if it has investor role): 5 sections (no Admin), all edit buttons hidden
- **manager**: 5 sections (no Admin), edit buttons present in all sections
- **staff**: 3 sections (Dashboard + Ops + Master), edit buttons present in Ops/Master

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete RBAC access control — route guards, nav filtering, edit controls"
```
