# Frontend Deployment Design

**Date:** 2026-04-22
**Status:** Approved

## Overview

Replace the fake localStorage auth with Firebase Email/Password auth, connect the frontend to the Cloud Run backend via a central API client, and deploy to Firebase Hosting. All pages remain unchanged — only `AuthContext`, `DataContext`, and the Login page are modified.

---

## Architecture

```
User
  │  email + password
  ▼
Login page → Firebase Auth (signInWithEmailAndPassword)
                    │
                    │  Firebase ID token (JWT)
                    ▼
            AuthContext (holds user + token)
                    │
                    │  Bearer <token> on every request
                    ▼
              src/lib/api.ts (central fetch wrapper)
                    │
                    ▼
        Cloud Run: https://superbus-api-78224080031.us-central1.run.app
                    │
                    ▼
              DataContext (replaces local static data)
                    │
                    ▼
              All pages (unchanged)
```

---

## Firebase Project

- **Project ID:** `project-4492076b-e4a4-4a4b-b5a`
- **Auth domain:** `project-4492076b-e4a4-4a4b-b5a.firebaseapp.com`
- **Auth method:** Email + Password only
- **User management:** Admin creates users in Firebase console; Firebase sends password-set emails via `sendPasswordResetEmail`

---

## File Map

**New files:**
- `frontend/src/firebase.ts` — Firebase SDK init, exports `auth`
- `frontend/src/lib/api.ts` — fetch wrapper with Bearer token injection
- `frontend/.env` — local dev env vars (gitignored)
- `frontend/.env.example` — committed template showing required vars
- `firebase.json` — Firebase Hosting config (repo root)
- `.firebaserc` — Firebase project link (repo root)

**Modified files:**
- `frontend/src/context/AuthContext.tsx` — replace fake auth with Firebase auth
- `frontend/src/context/DataContext.tsx` — replace local static data with API calls
- `frontend/src/pages/Login.tsx` — email field, forgot password UI
- `frontend/.gitignore` — ensure `.env` is listed

---

## Section 1: Firebase Setup

### Installation

```bash
cd frontend && npm install firebase
```

### `frontend/src/firebase.ts`

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### `frontend/.env` (local dev, gitignored)

```
VITE_FIREBASE_API_KEY=<from Firebase console>
VITE_FIREBASE_AUTH_DOMAIN=project-4492076b-e4a4-4a4b-b5a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-4492076b-e4a4-4a4b-b5a
VITE_API_URL=https://superbus-api-78224080031.us-central1.run.app
```

`VITE_FIREBASE_API_KEY` is found in Firebase console → Project Settings → General → Your apps → Web app config. It is safe to use in frontend code (Firebase restricts usage by authorized domain).

### `frontend/.env.example` (committed)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_API_URL=
```

---

## Section 2: AuthContext Replacement

### Interface

```ts
interface AuthContextValue {
  user: User | null;        // Firebase User object, null if not logged in
  loading: boolean;         // true while Firebase restores session on page load
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

### Key behaviors

- `loading: true` on first render while Firebase calls `onAuthStateChanged` — prevents flash to login page
- `login` calls `signInWithEmailAndPassword(auth, email, password)` — throws `FirebaseError` on failure
- `logout` calls `signOut(auth)`
- `resetPassword` calls `sendPasswordResetEmail(auth, email)`
- `ProtectedRoute` in `App.tsx` checks `user !== null && !loading`

### `App.tsx` change

```ts
// Before
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

// After
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
```

---

## Section 3: Login Page

Changes to `frontend/src/pages/Login.tsx`:

- Field label: "Username" → "Email"; input `type="text"` → `type="email"`
- `login(username, password)` → `await login(email, password)` (async, catches `FirebaseError`)
- Error message: show Firebase error (wrong password, user not found)
- Add "Forgot password?" link below the form:
  - Clicking shows an email input + "Send reset email" button
  - Calls `resetPassword(email)` on submit
  - Shows "Check your inbox" confirmation on success

---

## Section 4: API Client

### `frontend/src/lib/api.ts`

```ts
import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

---

## Section 5: DataContext Migration

### On mount — fetch all data in parallel

```ts
useEffect(() => {
  setLoading(true);
  Promise.all([
    apiFetch<Vehicle[]>('/api/v1/vehicles/'),
    apiFetch<Driver[]>('/api/v1/drivers/'),
    apiFetch<Customer[]>('/api/v1/customers/'),
    apiFetch<JobGroup[]>('/api/v1/job-groups/'),
    apiFetch<Job[]>('/api/v1/jobs/'),
    apiFetch<JobLineItem[]>('/api/v1/job-line-items/'),
    apiFetch<MaintenanceEntry[]>('/api/v1/maintenance/'),
    apiFetch<FuelEntry[]>('/api/v1/fuel/'),
    apiFetch<Inspection[]>('/api/v1/inspections/'),
    apiFetch<InsurancePolicy[]>('/api/v1/insurance/'),
    apiFetch<ParkingEntry[]>('/api/v1/parking/'),
    apiFetch<VehicleFixedCost[]>('/api/v1/vehicle-fixed-costs/'),
    apiFetch<DriverCost[]>('/api/v1/driver-costs/'),
    apiFetch<DriverVehicleAssignment[]>('/api/v1/driver-vehicle-assignments/'),
    apiFetch<GaEntry[]>('/api/v1/ga-entries/'),
  ]).then(([vehicles, drivers, customers, jobGroups, jobs, jobLineItems,
            maintenance, fuel, inspections, insurance, parking, vfc,
            driverCosts, assignments, gaEntries]) => {
    setVehicles(vehicles);
    setDrivers(drivers);
    // ... etc
    setLoading(false);
  }).catch(err => {
    setError(err.message);
    setLoading(false);
  });
}, []);
```

### Mutating methods pattern

```ts
// CREATE
async function addVehicle(v: Omit<Vehicle, 'id'>) {
  const created = await apiFetch<Vehicle>('/api/v1/vehicles/', {
    method: 'POST', body: JSON.stringify(v),
  });
  setVehicles(prev => [...prev, created]);
}

// UPDATE
async function updateVehicle(v: Vehicle) {
  const updated = await apiFetch<Vehicle>(`/api/v1/vehicles/${v.id}`, {
    method: 'PUT', body: JSON.stringify(v),
  });
  setVehicles(prev => prev.map(x => x.id === v.id ? updated : x));
}

// DELETE
async function deleteVehicle(id: number) {
  await apiFetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' });
  setVehicles(prev => prev.filter(x => x.id !== id));
}
```

### Context additions

```ts
interface DataContextValue extends DataSnapshot {
  loading: boolean;    // true while initial fetch is in flight
  error: string | null; // set if initial fetch fails
  // ... existing methods
}
```

---

## Section 6: Firebase Hosting

### `firebase.json` (repo root)

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### `.firebaserc` (repo root)

```json
{
  "projects": {
    "default": "project-4492076b-e4a4-4a4b-b5a"
  }
}
```

### Deploy flow

One-time Firebase CLI setup:
```bash
npm install -g firebase-tools
firebase login
```

Every deploy:
```bash
cd frontend && npm run build
cd .. && firebase deploy --only hosting
```

### Authorized domains

After first deploy, add the Firebase Hosting domain to Firebase console:
**Authentication → Settings → Authorized domains → Add domain**
`project-4492076b-e4a4-4a4b-b5a.web.app` (added automatically by Firebase)

---

---

## Section 7: Admin Bootstrap

The seed script (`seed/seed.py`) already creates the company, roles (admin/investor/manager/staff), and permissions — but no User records. A separate bootstrap script creates the initial admin user.

### `backend/seed/bootstrap_admin.py`

Takes `ADMIN_FIREBASE_UID` and `ADMIN_EMAIL` from environment variables:

```python
"""
Bootstrap the initial admin user.
Run once after the first migration + seed.

Usage (locally):
  DATABASE_URL=... ADMIN_FIREBASE_UID=xxx ADMIN_EMAIL=you@example.com python -m seed.bootstrap_admin

Usage (Cloud Run job):
  gcloud run jobs execute superbus-bootstrap --region=us-central1 --wait \
    --update-env-vars ADMIN_FIREBASE_UID=xxx,ADMIN_EMAIL=you@example.com
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.user import Role, User

engine = create_engine(os.environ["DATABASE_URL"])

def bootstrap():
    uid   = os.environ["ADMIN_FIREBASE_UID"]
    email = os.environ["ADMIN_EMAIL"]

    with Session(engine) as db:
        company = db.query(Company).first()
        if not company:
            raise RuntimeError("Run seed.py first — no company found.")

        role = db.query(Role).filter_by(company_id=company.id, name="admin").first()
        if not role:
            raise RuntimeError("Run seed.py first — admin role not found.")

        existing = db.query(User).filter_by(firebase_uid=uid).first()
        if existing:
            print(f"Admin user already exists (id={existing.id})")
            return

        user = User(
            company_id=company.id,
            role_id=role.id,
            firebase_uid=uid,
            email=email,
        )
        db.add(user)
        db.commit()
        print(f"Created admin user: {email} (firebase_uid={uid})")

if __name__ == "__main__":
    bootstrap()
```

### How to get the Firebase UID

1. Firebase console → Authentication → Users → create the admin user (enter email, set a password)
2. Click the user row — the UID is shown in the side panel (looks like `abc123xyz...`)
3. Use that UID when running the bootstrap job

### Bootstrap Cloud Run job

Create a one-off Cloud Run job `superbus-bootstrap` that runs the bootstrap script:

```bash
gcloud run jobs create superbus-bootstrap \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1 \
  --service-account=superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com \
  --set-cloudsql-instances=project-4492076b-e4a4-4a4b-b5a:us-central1:superbus-db \
  --set-secrets=DATABASE_URL=superbus-database-url:latest \
  --set-env-vars=FIREBASE_CREDENTIALS_PATH="" \
  --command=python \
  --args=-m,seed.bootstrap_admin \
  --max-retries=1
```

Run it with the admin's Firebase UID:

```bash
gcloud run jobs execute superbus-bootstrap \
  --region=us-central1 \
  --wait \
  --update-env-vars="ADMIN_FIREBASE_UID=<uid>,ADMIN_EMAIL=<email>"
```

Also run the data seed job once to populate initial data:

```bash
gcloud run jobs create superbus-seed \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1 \
  --service-account=superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com \
  --set-cloudsql-instances=project-4492076b-e4a4-4a4b-b5a:us-central1:superbus-db \
  --set-secrets=DATABASE_URL=superbus-database-url:latest \
  --set-env-vars=FIREBASE_CREDENTIALS_PATH="" \
  --command=python \
  --args=-m,seed.seed \
  --max-retries=1

gcloud run jobs execute superbus-seed --region=us-central1 --wait
```

---

## Section 8: User Management (Ongoing)

After the admin is set up, all new user management happens through the app's existing Users page (`/users`).

### Flow for adding a new user

1. **Admin creates the Firebase account:** Firebase console → Authentication → Add user (enter email + temporary password) → copy the UID
2. **Firebase sends the password-set email:** In Firebase console, click the user → "Send password reset email" → user sets their own password
3. **Admin creates the database record:** In the app → Users page → Add User → enter email, Firebase UID, select role → Save
4. **User can now log in** with full permissions matching their role

### Roles available

| Role | Permissions |
|---|---|
| `admin` | All permissions including user management |
| `manager` | Operations, master data, vehicle ops, G&A, profit, reports (read+write) |
| `investor` | Operations, master data, vehicle ops, G&A, profit, reports (read only) |
| `staff` | Operations, master data, vehicle ops, G&A (read+write) |

### Users page requirements

The existing `/users` route needs to be connected to the API (same as all other pages). It calls:
- `GET /api/v1/users/` — list users
- `POST /api/v1/users/` — create user (body: `{ firebase_uid, email, role_id }`)
- `PUT /api/v1/users/{id}` — update role
- `DELETE /api/v1/users/{id}` — remove user

---

## Out of Scope

- Google Sign-In or other auth providers
- CI/CD for frontend (added later)
- Custom domain for Firebase Hosting (added later)
- Per-user permissions in the frontend (backend enforces via RBAC)
