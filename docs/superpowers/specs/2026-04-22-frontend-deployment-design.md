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

## Out of Scope

- Google Sign-In or other auth providers
- CI/CD for frontend (added later)
- Custom domain for Firebase Hosting (added later)
- Per-user permissions in the frontend (backend enforces via RBAC)
