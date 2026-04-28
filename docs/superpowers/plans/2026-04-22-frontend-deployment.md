# Frontend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake localStorage auth with Firebase Email/Password auth, connect all pages to the Cloud Run backend via a central API client, and deploy the frontend to Firebase Hosting.

**Architecture:** Firebase Auth handles login; the `AuthContext` holds the Firebase User and exposes `login`/`logout`/`resetPassword`. All backend calls go through `apiFetch` in `src/lib/api.ts`, which attaches the Bearer token and transforms snake_case↔camelCase between the backend API and the camelCase TypeScript types. `DataContext` fetches all data on mount and exposes async mutating methods. All existing pages remain unchanged.

**Tech Stack:** React 18, TypeScript, Vite, Firebase JS SDK v10, firebase-tools CLI, Cloud Run backend at `https://superbus-api-78224080031.us-central1.run.app`

---

## Constants

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `project-4492076b-e4a4-4a4b-b5a` |
| `FIREBASE_AUTH_DOMAIN` | `project-4492076b-e4a4-4a4b-b5a.firebaseapp.com` |
| `API_URL` | `https://superbus-api-78224080031.us-central1.run.app` |

---

## File Map

**New files:**
- `frontend/src/firebase.ts` — Firebase app init, exports `auth`
- `frontend/src/lib/api.ts` — fetch wrapper: token injection + snake↔camel transform
- `frontend/.env.example` — committed template with empty var names
- `firebase.json` — Firebase Hosting config (repo root)
- `.firebaserc` — Firebase project link (repo root)
- `backend/seed/bootstrap_admin.py` — one-time admin User bootstrap script
- `frontend/src/pages/Users.tsx` — new Users management page

**Modified files:**
- `frontend/src/context/AuthContext.tsx` — full rewrite with Firebase auth
- `frontend/src/context/DataContext.tsx` — full rewrite fetching from API
- `frontend/src/pages/Login.tsx` — email field + forgot password UI
- `frontend/src/App.tsx` — ProtectedRoute uses `user`+`loading`; add `/users` route
- `frontend/src/components/TopNav.tsx` — add Admin section linking to `/users`
- `frontend/src/i18n/locales/en.ts` — add email/forgot-password keys
- `frontend/src/i18n/locales/zh.ts` — add email/forgot-password keys
- `frontend/src/i18n/locales/es.ts` — add email/forgot-password keys
- `frontend/.gitignore` — add `.env`

---

### Task 1: Firebase SDK install + env files

**Files:**
- Create: `frontend/src/firebase.ts`
- Create: `frontend/.env.example`
- Modify: `frontend/.gitignore`

- [ ] **Step 1: Install the Firebase JS SDK**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm install firebase
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Get your Firebase Web App API key**

1. Open [Firebase console](https://console.firebase.google.com) → project `project-4492076b-e4a4-4a4b-b5a`
2. Click the gear icon → **Project Settings** → **General** tab
3. Scroll to **Your apps** → click **Add app** → choose Web (`</>`)
4. Register app name `superbus-web` → copy the `apiKey` value shown in the config object

You'll use this key in Step 4.

- [ ] **Step 3: Enable Email/Password sign-in**

1. Firebase console → **Authentication** → **Sign-in method** tab
2. Click **Email/Password** → enable the first toggle → **Save**

- [ ] **Step 4: Create `frontend/.env` with your values**

Create `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/.env`:

```
VITE_FIREBASE_API_KEY=<paste your apiKey here>
VITE_FIREBASE_AUTH_DOMAIN=project-4492076b-e4a4-4a4b-b5a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-4492076b-e4a4-4a4b-b5a
VITE_API_URL=https://superbus-api-78224080031.us-central1.run.app
```

This file is gitignored — never commit it.

- [ ] **Step 5: Create `frontend/.env.example`**

Create `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/.env.example`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_API_URL=
```

- [ ] **Step 6: Create `frontend/src/firebase.ts`**

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

- [ ] **Step 7: Add `.env` to `frontend/.gitignore`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/.gitignore` and add `.env` at the top (below any comments). The file currently ends with `.sw?`. Add after the last line:

```
.env
```

- [ ] **Step 8: Verify the dev server starts**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm run dev
```

Expected: `VITE ready` — no import errors. Open `http://localhost:5173` and see the login page. Stop the server with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/firebase.ts frontend/.env.example frontend/.gitignore frontend/package.json frontend/package-lock.json
git commit -m "feat: add Firebase SDK + env template"
```

---

### Task 2: API client (`src/lib/api.ts`)

**Files:**
- Create: `frontend/src/lib/api.ts`

The backend API uses snake_case field names (Python convention). The frontend TypeScript types use camelCase. This file handles the translation both ways: responses are converted snake_case → camelCase, and request bodies are converted camelCase → snake_case before sending.

- [ ] **Step 1: Create `frontend/src/lib/api.ts`**

```ts
import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL as string;

// snake_case ↔ camelCase helpers
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, c => '_' + c.toLowerCase());
}

function deepTransform(obj: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map(v => deepTransform(v, fn));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => [fn(k), deepTransform(v, fn)])
    );
  }
  return obj;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();

  // Convert camelCase request body to snake_case for the backend
  let body = options.body;
  if (typeof body === 'string') {
    body = JSON.stringify(deepTransform(JSON.parse(body), toSnake));
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  return deepTransform(data, toCamel) as T;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to `api.ts`).

- [ ] **Step 3: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/lib/api.ts
git commit -m "feat: add apiFetch with snake↔camel transform"
```

---

### Task 3: Replace `AuthContext` with Firebase auth

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

The current `AuthContext` uses localStorage. Replace it entirely with Firebase auth. The `login`, `logout`, and `resetPassword` functions are async. The `loading` flag prevents a flash to the login page while Firebase restores the session.

- [ ] **Step 1: Overwrite `frontend/src/context/AuthContext.tsx`**

```tsx
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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout(): Promise<void> {
    await signOut(auth);
  }

  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetPassword }}>
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only mentioning `App.tsx` and `TopNav.tsx` where `isLoggedIn` is now gone — those will be fixed in the next two tasks.

- [ ] **Step 3: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/context/AuthContext.tsx
git commit -m "feat: replace AuthContext with Firebase auth"
```

---

### Task 4: Update `App.tsx` — ProtectedRoute + Users route

**Files:**
- Modify: `frontend/src/App.tsx`

Replace `isLoggedIn` with `user + loading` in `ProtectedRoute`. Add the `/users` route. Move `DataProvider` outside the protected route so it can be conditionally mounted after auth is confirmed.

- [ ] **Step 1: Overwrite `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
                    <Route path="/profit/profitability" element={<Profitability />} />
                    <Route path="/master/vehicles" element={<Vehicles />} />
                    <Route path="/master/vehicles/:id" element={<VehicleDetail />} />
                    <Route path="/master/customers" element={<Customers />} />
                    <Route path="/master/customers/:id" element={<CustomerDetail />} />
                    <Route path="/master/drivers" element={<Drivers />} />
                    <Route path="/master/ga-expenses" element={<GaExpenses />} />
                    <Route path="/reports/pl" element={<Reports />} />
                    <Route path="/reports/vehicle" element={<VehicleReport />} />
                    <Route path="/reports/job-group" element={<JobGroupReport />} />
                    <Route path="/admin/users" element={<Users />} />
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

- [ ] **Step 2: Add Admin section to `TopNav.tsx`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/components/TopNav.tsx` and find the `sections` array:

```ts
  const sections = [
    { label: t('nav.dashboard'),    path: '/',                    prefix: '' },
    { label: t('nav.operations'),   path: '/ops/job-groups',      prefix: '/ops' },
    { label: t('nav.masterData'),   path: '/master/vehicles',     prefix: '/master' },
    { label: t('nav.profitCenter'), path: '/profit/profitability',prefix: '/profit' },
    { label: t('nav.reports'),      path: '/reports/pl',          prefix: '/reports' },
  ];
```

Replace it with:

```ts
  const sections = [
    { label: t('nav.dashboard'),    path: '/',                    prefix: '' },
    { label: t('nav.operations'),   path: '/ops/job-groups',      prefix: '/ops' },
    { label: t('nav.masterData'),   path: '/master/vehicles',     prefix: '/master' },
    { label: t('nav.profitCenter'), path: '/profit/profitability',prefix: '/profit' },
    { label: t('nav.reports'),      path: '/reports/pl',          prefix: '/reports' },
    { label: t('nav.admin'),        path: '/admin/users',         prefix: '/admin' },
  ];
```

Also update the `logout` button's `onClick` in `TopNav.tsx` — it currently calls `logout()` synchronously but `logout` is now async. Find:

```tsx
        onClick={() => { logout(); navigate('/login', { replace: true }); }}
```

Replace with:

```tsx
        onClick={() => { logout().then(() => navigate('/login', { replace: true })); }}
```

- [ ] **Step 3: Add `nav.admin` translation keys**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/en.ts` and find the `nav:` section:

```ts
  nav: {
    dashboard: 'Dashboard',
    operations: 'Operations',
    profitCenter: 'Profit Center',
    masterData: 'Master Data',
    reports: 'Reports',
  },
```

Replace with:

```ts
  nav: {
    dashboard: 'Dashboard',
    operations: 'Operations',
    profitCenter: 'Profit Center',
    masterData: 'Master Data',
    reports: 'Reports',
    admin: 'Admin',
  },
```

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/zh.ts` and find the `nav:` section:

```ts
  nav: {
    dashboard: '仪表盘',
    operations: '运营',
    profitCenter: '利润中心',
    masterData: '主数据',
    reports: '报表',
  },
```

Replace with:

```ts
  nav: {
    dashboard: '仪表盘',
    operations: '运营',
    profitCenter: '利润中心',
    masterData: '主数据',
    reports: '报表',
    admin: '管理',
  },
```

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/es.ts` and find the `nav:` section:

```ts
  nav: {
    dashboard: 'Panel',
    operations: 'Operaciones',
    profitCenter: 'Centro de Ganancias',
    masterData: 'Datos Maestros',
    reports: 'Informes',
  },
```

Replace with:

```ts
  nav: {
    dashboard: 'Panel',
    operations: 'Operaciones',
    profitCenter: 'Centro de Ganancias',
    masterData: 'Datos Maestros',
    reports: 'Informes',
    admin: 'Admin',
  },
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only from `Login.tsx` (using old `login(username, password)` signature) — fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/App.tsx frontend/src/components/TopNav.tsx frontend/src/i18n/locales/en.ts frontend/src/i18n/locales/zh.ts frontend/src/i18n/locales/es.ts
git commit -m "feat: update ProtectedRoute for Firebase auth, add admin nav"
```

---

### Task 5: Update `Login.tsx` — email field + forgot password

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/i18n/locales/en.ts`
- Modify: `frontend/src/i18n/locales/zh.ts`
- Modify: `frontend/src/i18n/locales/es.ts`

- [ ] **Step 1: Add login i18n keys to `en.ts`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/en.ts` and find the `login:` section:

```ts
  login: {
    subtitle: 'Fleet Management System',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    error: 'Please enter a username and password.',
    submit: 'Sign In',
    logout: 'Sign Out',
  },
```

Replace with:

```ts
  login: {
    subtitle: 'Fleet Management System',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    error: 'Invalid email or password.',
    submit: 'Sign In',
    logout: 'Sign Out',
    forgotPassword: 'Forgot password?',
    resetEmailLabel: 'Enter your email to receive a reset link',
    sendResetEmail: 'Send Reset Email',
    resetEmailSent: 'Check your inbox for the password reset email.',
  },
```

- [ ] **Step 2: Add login i18n keys to `zh.ts`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/zh.ts` and find the `login:` section:

```ts
  login: {
    subtitle: '车队管理系统',
    username: '用户名',
    usernamePlaceholder: '请输入用户名',
    password: '密码',
    error: '请输入用户名和密码。',
    submit: '登录',
    logout: '退出',
  },
```

Replace with:

```ts
  login: {
    subtitle: '车队管理系统',
    username: '用户名',
    usernamePlaceholder: '请输入用户名',
    email: '邮箱',
    emailPlaceholder: '请输入邮箱',
    password: '密码',
    error: '邮箱或密码错误。',
    submit: '登录',
    logout: '退出',
    forgotPassword: '忘记密码？',
    resetEmailLabel: '输入您的邮箱以接收重置链接',
    sendResetEmail: '发送重置邮件',
    resetEmailSent: '请查看您的收件箱。',
  },
```

- [ ] **Step 3: Add login i18n keys to `es.ts`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/i18n/locales/es.ts` and find the `login:` section:

```ts
  login: {
    subtitle: 'Sistema de Gestión de Flota',
    username: 'Usuario',
    usernamePlaceholder: 'Ingrese su usuario',
    password: 'Contraseña',
    error: 'Por favor ingrese usuario y contraseña.',
    submit: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
  },
```

Replace with:

```ts
  login: {
    subtitle: 'Sistema de Gestión de Flota',
    username: 'Usuario',
    usernamePlaceholder: 'Ingrese su usuario',
    email: 'Correo electrónico',
    emailPlaceholder: 'Ingrese su correo',
    password: 'Contraseña',
    error: 'Correo o contraseña incorrectos.',
    submit: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    forgotPassword: '¿Olvidó su contraseña?',
    resetEmailLabel: 'Ingrese su correo para recibir el enlace de restablecimiento',
    sendResetEmail: 'Enviar correo de restablecimiento',
    resetEmailSent: 'Revise su bandeja de entrada.',
  },
```

- [ ] **Step 4: Overwrite `frontend/src/pages/Login.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError(t('login.error'));
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setResetError(t('login.error'));
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-white tracking-tight">
            Eva<span className="text-blue-400">Bus</span>
          </span>
          <p className="text-slate-400 text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {!showReset ? (
          /* Login form */
          <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl shadow-xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoFocus
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {t('login.submit')}
            </button>

            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="w-full text-slate-400 hover:text-slate-200 text-sm text-center transition-colors"
            >
              {t('login.forgotPassword')}
            </button>
          </form>
        ) : (
          /* Forgot password form */
          <form onSubmit={handleReset} className="bg-slate-800 rounded-2xl shadow-xl p-8 space-y-5">
            {!resetSent ? (
              <>
                <p className="text-slate-300 text-sm">{t('login.resetEmailLabel')}</p>
                <div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                    autoFocus
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('login.emailPlaceholder')}
                  />
                </div>
                {resetError && (
                  <p className="text-red-400 text-sm">{resetError}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {t('login.sendResetEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="w-full text-slate-400 hover:text-slate-200 text-sm text-center transition-colors"
                >
                  ← Back to Sign In
                </button>
              </>
            ) : (
              <>
                <p className="text-green-400 text-sm">{t('login.resetEmailSent')}</p>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Back to Sign In
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only from `DataContext.tsx` (still using old static imports) — fixed in Task 6. No errors in `Login.tsx` or `AuthContext.tsx`.

- [ ] **Step 6: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/pages/Login.tsx frontend/src/i18n/locales/en.ts frontend/src/i18n/locales/zh.ts frontend/src/i18n/locales/es.ts
git commit -m "feat: update Login page — email field + forgot password"
```

---

### Task 6: Migrate `DataContext` to API calls

**Files:**
- Modify: `frontend/src/context/DataContext.tsx`

This is a full rewrite. All static data imports are removed. Data is fetched from the API on mount. All mutating methods become async (TypeScript allows assigning `() => Promise<void>` to `() => void`, so call sites in pages remain unchanged).

- [ ] **Step 1: Overwrite `frontend/src/context/DataContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Vehicle, Driver, Customer, JobGroup, Job, JobLineItem,
  MaintenanceEntry, FuelEntry, Inspection, GaEntry, VehicleFixedCost,
  InsurancePolicy, ParkingEntry, DriverCost, DriverVehicleAssignment,
} from '../types';
import { apiFetch } from '../lib/api';
import type { DataSnapshot } from '../lib/profit';

interface DataContextValue extends DataSnapshot {
  loading: boolean;
  error: string | null;
  // Vehicles
  addVehicle: (v: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (v: Vehicle) => void;
  deleteVehicle: (id: number) => void;
  // Drivers
  addDriver: (d: Omit<Driver, 'id'>) => void;
  updateDriver: (d: Driver) => void;
  deleteDriver: (id: number) => void;
  // Customers
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: number) => void;
  // Job Groups
  addJobGroup: (jg: Omit<JobGroup, 'id'>) => void;
  updateJobGroup: (jg: JobGroup) => void;
  deleteJobGroup: (id: number) => void;
  // Jobs
  addJob: (j: Omit<Job, 'id'>) => void;
  updateJob: (j: Job) => void;
  deleteJob: (id: number) => void;
  // Job Line Items
  addJobLineItem: (li: Omit<JobLineItem, 'id'>) => void;
  updateJobLineItem: (li: JobLineItem) => void;
  deleteJobLineItem: (id: number) => void;
  deleteJobLineItemsByJobId: (jobId: number) => void;
  // Maintenance
  addMaintenance: (e: Omit<MaintenanceEntry, 'id'>) => void;
  updateMaintenance: (e: MaintenanceEntry) => void;
  deleteMaintenance: (id: number) => void;
  // Fuel
  addFuel: (e: Omit<FuelEntry, 'id'>) => void;
  updateFuel: (e: FuelEntry) => void;
  deleteFuel: (id: number) => void;
  // Inspections
  addInspection: (e: Omit<Inspection, 'id'>) => void;
  updateInspection: (e: Inspection) => void;
  deleteInspection: (id: number) => void;
  // G&A Entries
  addGaEntry: (e: Omit<GaEntry, 'id'>) => void;
  updateGaEntry: (e: GaEntry) => void;
  deleteGaEntry: (id: number) => void;
  // Vehicle Fixed Costs
  addVehicleFixedCost: (e: Omit<VehicleFixedCost, 'id'>) => void;
  updateVehicleFixedCost: (e: VehicleFixedCost) => void;
  deleteVehicleFixedCost: (id: number) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobLineItems, setJobLineItems] = useState<JobLineItem[]>([]);
  const [maintenanceEntries, setMaintenance] = useState<MaintenanceEntry[]>([]);
  const [fuelEntries, setFuel] = useState<FuelEntry[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [insurancePolicies, setInsurance] = useState<InsurancePolicy[]>([]);
  const [parkingEntries, setParking] = useState<ParkingEntry[]>([]);
  const [driverCosts, setDriverCosts] = useState<DriverCost[]>([]);
  const [driverVehicleAssignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [gaEntries, setGaEntries] = useState<GaEntry[]>([]);
  const [vehicleFixedCosts, setVehicleFixedCosts] = useState<VehicleFixedCost[]>([]);

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
      apiFetch<DriverCost[]>('/api/v1/driver-costs/'),
      apiFetch<DriverVehicleAssignment[]>('/api/v1/driver-vehicle-assignments/'),
      apiFetch<GaEntry[]>('/api/v1/ga-entries/'),
      apiFetch<VehicleFixedCost[]>('/api/v1/vehicle-fixed-costs/'),
    ]).then(([v, dr, cu, jg, j, li, ma, fu, ins, insP, pa, dc, dva, ga, vfc]) => {
      setVehicles(v);
      setDrivers(dr);
      setCustomers(cu);
      setJobGroups(jg);
      setJobs(j);
      setJobLineItems(li);
      setMaintenance(ma);
      setFuel(fu);
      setInspections(ins);
      setInsurance(insP);
      setParking(pa);
      setDriverCosts(dc);
      setAssignments(dva);
      setGaEntries(ga);
      setVehicleFixedCosts(vfc);
      setLoading(false);
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const value: DataContextValue = {
    loading,
    error,
    vehicles, drivers, customers, jobGroups, jobs,
    jobLineItems, maintenanceEntries, fuelEntries, inspections,
    insurancePolicies, parkingEntries, driverCosts, gaEntries, vehicleFixedCosts,
    // @ts-ignore — driverVehicleAssignments is not in DataSnapshot but used by Drivers page
    driverVehicleAssignments,

    // Vehicles
    addVehicle: async (v) => {
      const created = await apiFetch<Vehicle>('/api/v1/vehicles/', { method: 'POST', body: JSON.stringify(v) });
      setVehicles(prev => [...prev, created]);
    },
    updateVehicle: async (v) => {
      const updated = await apiFetch<Vehicle>(`/api/v1/vehicles/${v.id}`, { method: 'PUT', body: JSON.stringify(v) });
      setVehicles(prev => prev.map(x => x.id === v.id ? updated : x));
    },
    deleteVehicle: async (id) => {
      await apiFetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(prev => prev.filter(x => x.id !== id));
    },

    // Drivers
    addDriver: async (d) => {
      const created = await apiFetch<Driver>('/api/v1/drivers/', { method: 'POST', body: JSON.stringify(d) });
      setDrivers(prev => [...prev, created]);
    },
    updateDriver: async (d) => {
      const updated = await apiFetch<Driver>(`/api/v1/drivers/${d.id}`, { method: 'PUT', body: JSON.stringify(d) });
      setDrivers(prev => prev.map(x => x.id === d.id ? updated : x));
    },
    deleteDriver: async (id) => {
      await apiFetch(`/api/v1/drivers/${id}`, { method: 'DELETE' });
      setDrivers(prev => prev.filter(x => x.id !== id));
    },

    // Customers
    addCustomer: async (c) => {
      const created = await apiFetch<Customer>('/api/v1/customers/', { method: 'POST', body: JSON.stringify(c) });
      setCustomers(prev => [...prev, created]);
    },
    updateCustomer: async (c) => {
      const updated = await apiFetch<Customer>(`/api/v1/customers/${c.id}`, { method: 'PUT', body: JSON.stringify(c) });
      setCustomers(prev => prev.map(x => x.id === c.id ? updated : x));
    },
    deleteCustomer: async (id) => {
      await apiFetch(`/api/v1/customers/${id}`, { method: 'DELETE' });
      setCustomers(prev => prev.filter(x => x.id !== id));
    },

    // Job Groups
    addJobGroup: async (jg) => {
      const created = await apiFetch<JobGroup>('/api/v1/job-groups/', { method: 'POST', body: JSON.stringify(jg) });
      setJobGroups(prev => [...prev, created]);
    },
    updateJobGroup: async (jg) => {
      const updated = await apiFetch<JobGroup>(`/api/v1/job-groups/${jg.id}`, { method: 'PUT', body: JSON.stringify(jg) });
      setJobGroups(prev => prev.map(x => x.id === jg.id ? updated : x));
    },
    deleteJobGroup: async (id) => {
      await apiFetch(`/api/v1/job-groups/${id}`, { method: 'DELETE' });
      setJobGroups(prev => prev.filter(x => x.id !== id));
    },

    // Jobs
    addJob: async (j) => {
      const created = await apiFetch<Job>('/api/v1/jobs/', { method: 'POST', body: JSON.stringify(j) });
      setJobs(prev => [...prev, created]);
    },
    updateJob: async (j) => {
      const updated = await apiFetch<Job>(`/api/v1/jobs/${j.id}`, { method: 'PUT', body: JSON.stringify(j) });
      setJobs(prev => prev.map(x => x.id === j.id ? updated : x));
    },
    deleteJob: async (id) => {
      await apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(x => x.id !== id));
    },

    // Job Line Items
    addJobLineItem: async (li) => {
      const created = await apiFetch<JobLineItem>('/api/v1/job-line-items/', { method: 'POST', body: JSON.stringify(li) });
      setJobLineItems(prev => [...prev, created]);
    },
    updateJobLineItem: async (li) => {
      const updated = await apiFetch<JobLineItem>(`/api/v1/job-line-items/${li.id}`, { method: 'PUT', body: JSON.stringify(li) });
      setJobLineItems(prev => prev.map(x => x.id === li.id ? updated : x));
    },
    deleteJobLineItem: async (id) => {
      await apiFetch(`/api/v1/job-line-items/${id}`, { method: 'DELETE' });
      setJobLineItems(prev => prev.filter(x => x.id !== id));
    },
    deleteJobLineItemsByJobId: async (jobId) => {
      const toDelete = jobLineItems.filter(li => li.jobId === jobId);
      await Promise.all(toDelete.map(li => apiFetch(`/api/v1/job-line-items/${li.id}`, { method: 'DELETE' })));
      setJobLineItems(prev => prev.filter(x => x.jobId !== jobId));
    },

    // Maintenance
    addMaintenance: async (e) => {
      const created = await apiFetch<MaintenanceEntry>('/api/v1/maintenance/', { method: 'POST', body: JSON.stringify(e) });
      setMaintenance(prev => [...prev, created]);
    },
    updateMaintenance: async (e) => {
      const updated = await apiFetch<MaintenanceEntry>(`/api/v1/maintenance/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setMaintenance(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteMaintenance: async (id) => {
      await apiFetch(`/api/v1/maintenance/${id}`, { method: 'DELETE' });
      setMaintenance(prev => prev.filter(x => x.id !== id));
    },

    // Fuel
    addFuel: async (e) => {
      const created = await apiFetch<FuelEntry>('/api/v1/fuel/', { method: 'POST', body: JSON.stringify(e) });
      setFuel(prev => [...prev, created]);
    },
    updateFuel: async (e) => {
      const updated = await apiFetch<FuelEntry>(`/api/v1/fuel/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setFuel(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteFuel: async (id) => {
      await apiFetch(`/api/v1/fuel/${id}`, { method: 'DELETE' });
      setFuel(prev => prev.filter(x => x.id !== id));
    },

    // Inspections
    addInspection: async (e) => {
      const created = await apiFetch<Inspection>('/api/v1/inspections/', { method: 'POST', body: JSON.stringify(e) });
      setInspections(prev => [...prev, created]);
    },
    updateInspection: async (e) => {
      const updated = await apiFetch<Inspection>(`/api/v1/inspections/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setInspections(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteInspection: async (id) => {
      await apiFetch(`/api/v1/inspections/${id}`, { method: 'DELETE' });
      setInspections(prev => prev.filter(x => x.id !== id));
    },

    // G&A Entries
    addGaEntry: async (e) => {
      const created = await apiFetch<GaEntry>('/api/v1/ga-entries/', { method: 'POST', body: JSON.stringify(e) });
      setGaEntries(prev => [...prev, created]);
    },
    updateGaEntry: async (e) => {
      const updated = await apiFetch<GaEntry>(`/api/v1/ga-entries/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setGaEntries(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteGaEntry: async (id) => {
      await apiFetch(`/api/v1/ga-entries/${id}`, { method: 'DELETE' });
      setGaEntries(prev => prev.filter(x => x.id !== id));
    },

    // Vehicle Fixed Costs
    addVehicleFixedCost: async (e) => {
      const created = await apiFetch<VehicleFixedCost>('/api/v1/vehicle-fixed-costs/', { method: 'POST', body: JSON.stringify(e) });
      setVehicleFixedCosts(prev => [...prev, created]);
    },
    updateVehicleFixedCost: async (e) => {
      const updated = await apiFetch<VehicleFixedCost>(`/api/v1/vehicle-fixed-costs/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setVehicleFixedCosts(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteVehicleFixedCost: async (id) => {
      await apiFetch(`/api/v1/vehicle-fixed-costs/${id}`, { method: 'DELETE' });
      setVehicleFixedCosts(prev => prev.filter(x => x.id !== id));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (the `@ts-ignore` suppresses the driverVehicleAssignments type mismatch).

- [ ] **Step 3: Manual smoke test (dev server)**

First, make sure you have a Firebase user set up:
1. Firebase console → Authentication → Add user → enter an email and password
2. Copy their UID from the user row

Then run:
```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm run dev
```

Open `http://localhost:5173`. You should see the login page. Enter the Firebase user's credentials. After login, the app should load and show the Dashboard (which may be empty if the backend has no data yet — that's expected).

Stop the server when done.

- [ ] **Step 4: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/context/DataContext.tsx
git commit -m "feat: migrate DataContext to API — all reads/writes via apiFetch"
```

---

### Task 7: Backend bootstrap admin script

**Files:**
- Create: `backend/seed/bootstrap_admin.py`

This one-time script creates the initial admin `User` record in the database, linking a Firebase UID to the `admin` role. Run it after the database is migrated and seeded.

- [ ] **Step 1: Create `backend/seed/bootstrap_admin.py`**

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
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.user import Role, User


engine = create_engine(os.environ["DATABASE_URL"])


def bootstrap():
    uid = os.environ["ADMIN_FIREBASE_UID"]
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

- [ ] **Step 2: Create the seed Cloud Run job (one-time)**

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
```

Expected: `Job [superbus-seed] has been successfully created.`

- [ ] **Step 3: Run the seed job**

```bash
gcloud run jobs execute superbus-seed --region=us-central1 --wait
```

Expected: `Execution [superbus-seed-xxxxx] has successfully completed.`

This populates company, roles, and permissions — but no User records (those come from bootstrap).

- [ ] **Step 4: Create the bootstrap Cloud Run job (one-time)**

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

Expected: `Job [superbus-bootstrap] has been successfully created.`

- [ ] **Step 5: Get the admin Firebase UID**

1. Firebase console → Authentication → Users
2. If you already created a user in Task 6 Step 3 above, click that user row → copy the UID (looks like `abc123xyz...`)
3. If not, click **Add user** → enter email and password → copy the UID

- [ ] **Step 6: Run the bootstrap job**

Replace `<uid>` and `<email>` with the admin's actual values:

```bash
gcloud run jobs execute superbus-bootstrap \
  --region=us-central1 \
  --wait \
  --update-env-vars="ADMIN_FIREBASE_UID=<uid>,ADMIN_EMAIL=<email>"
```

Expected: execution logs show `Created admin user: <email> (firebase_uid=<uid>)`

Verify by checking logs:

```bash
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=superbus-bootstrap" \
  --limit=10 \
  --format="value(textPayload)" \
  --order=asc
```

Expected: last line contains `Created admin user`.

- [ ] **Step 7: Rebuild and redeploy the backend with the new bootstrap_admin.py**

The new file must be in the Docker image for the Cloud Run job to run it:

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
docker build -t us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest .
docker push us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest

gcloud run deploy superbus-api \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1

gcloud run jobs update superbus-seed \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1

gcloud run jobs update superbus-bootstrap \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1
```

Expected: all commands succeed with `done` status.

- [ ] **Step 8: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add backend/seed/bootstrap_admin.py
git commit -m "feat: add bootstrap_admin.py script for initial admin user"
```

---

### Task 8: Users management page

**Files:**
- Create: `frontend/src/pages/Users.tsx`

This page lists all users, allows creating new users (entering Firebase UID + email + role), updating role, and deleting users. Roles are fetched from `/api/v1/roles/`.

The backend returns fields like `firebase_uid`, `role_id` — after `apiFetch` camelCase transform these become `firebaseUid`, `roleId`.

- [ ] **Step 1: Add `User` and `Role` types to `frontend/src/types/index.ts`**

Open `/Users/lifeiwang/Documents/GitHub/BusDemo/frontend/src/types/index.ts` and add at the end:

```ts
export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface AppUser {
  id: number;
  firebaseUid: string;
  email: string;
  name: string;
  roleId: number;
  isActive: boolean;
}
```

- [ ] **Step 2: Create `frontend/src/pages/Users.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { Role, AppUser } from '../types';

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New user form state
  const [showForm, setShowForm] = useState(false);
  const [newFirebaseUid, setNewFirebaseUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<AppUser[]>('/api/v1/users/'),
      apiFetch<Role[]>('/api/v1/roles/'),
    ]).then(([u, r]) => {
      setUsers(u);
      setRoles(r);
      setLoading(false);
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      const created = await apiFetch<AppUser>('/api/v1/users/', {
        method: 'POST',
        body: JSON.stringify({
          firebaseUid: newFirebaseUid.trim(),
          email: newEmail.trim(),
          name: newName.trim(),
          roleId: Number(newRoleId),
          isActive: true,
        }),
      });
      setUsers(prev => [...prev, created]);
      setNewFirebaseUid('');
      setNewEmail('');
      setNewName('');
      setNewRoleId('');
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating user');
    }
  }

  async function handleRoleChange(user: AppUser, roleId: number) {
    try {
      const updated = await apiFetch<AppUser>(`/api/v1/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...user, roleId }),
      });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating user');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this user? They will lose access to the app.')) return;
    try {
      await apiFetch(`/api/v1/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  }

  function roleLabel(roleId: number) {
    return roles.find(r => r.id === roleId)?.name ?? '—';
  }

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="text-red-500 text-sm">Error: {error}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Add New User</h2>
          <p className="text-sm text-slate-500">
            Create the Firebase account first (Firebase console → Authentication → Add user),
            then enter the Firebase UID shown in the user row.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Firebase UID *</label>
              <input
                value={newFirebaseUid}
                onChange={e => setNewFirebaseUid(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="abc123xyz..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
              <select
                value={newRoleId}
                onChange={e => setNewRoleId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select role...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Create User
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Firebase UID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-800">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">{user.name || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.roleId}
                    onChange={e => handleRoleChange(user, Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{user.firebaseUid}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No users yet. Add the first user above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add frontend/src/pages/Users.tsx frontend/src/types/index.ts
git commit -m "feat: add Users management page with role assignment"
```

---

### Task 9: Firebase Hosting setup + deploy

**Files:**
- Create: `firebase.json` (repo root)
- Create: `.firebaserc` (repo root)

- [ ] **Step 1: Install firebase-tools globally (one-time)**

```bash
npm install -g firebase-tools
```

Expected: `added N packages` — no errors.

- [ ] **Step 2: Log in to Firebase CLI (one-time)**

```bash
firebase login
```

A browser tab opens. Sign in with the Google account that owns Firebase project `project-4492076b-e4a4-4a4b-b5a`. After signing in, you should see `✔  Success! Logged in as you@example.com`.

- [ ] **Step 3: Create `firebase.json` at the repo root**

Create `/Users/lifeiwang/Documents/GitHub/BusDemo/firebase.json`:

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

- [ ] **Step 4: Create `.firebaserc` at the repo root**

Create `/Users/lifeiwang/Documents/GitHub/BusDemo/.firebaserc`:

```json
{
  "projects": {
    "default": "project-4492076b-e4a4-4a4b-b5a"
  }
}
```

- [ ] **Step 5: Build the frontend**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm run build
```

Expected: `dist/` directory created with `index.html` and hashed asset files. No TypeScript or build errors.

- [ ] **Step 6: Deploy to Firebase Hosting**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
firebase deploy --only hosting
```

Expected output:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/project-4492076b-e4a4-4a4b-b5a/overview
Hosting URL: https://project-4492076b-e4a4-4a4b-b5a.web.app
```

- [ ] **Step 7: Add the hosting domain to Firebase Auth authorized domains**

1. Firebase console → **Authentication** → **Settings** tab → **Authorized domains**
2. The domain `project-4492076b-e4a4-4a4b-b5a.web.app` should already be listed (Firebase adds it automatically)
3. If it's missing, click **Add domain** and add it

- [ ] **Step 8: Smoke test the deployed app**

Open `https://project-4492076b-e4a4-4a4b-b5a.web.app` in a browser. You should see the login page. Log in with your admin Firebase credentials. The Dashboard should load (data may be empty if bootstrap hasn't run yet).

- [ ] **Step 9: Commit**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add firebase.json .firebaserc
git commit -m "feat: add Firebase Hosting config"
```

---

## Ongoing Deploy Workflow

Every time you change frontend code:

```bash
# 1. Build
cd /Users/lifeiwang/Documents/GitHub/BusDemo/frontend
npm run build

# 2. Deploy
cd /Users/lifeiwang/Documents/GitHub/BusDemo
firebase deploy --only hosting
```

---

## Self-Review

**Spec coverage:**
- Section 1 (Firebase Setup): firebase.ts + env files ✅ Task 1
- Section 2 (AuthContext): Firebase auth with loading flag ✅ Task 3
- Section 3 (Login): email field + forgot password ✅ Task 5
- Section 4 (API client): apiFetch with Bearer token + snake↔camel ✅ Task 2
- Section 5 (DataContext): fetch all on mount + mutating methods ✅ Task 6
- Section 6 (Firebase Hosting): firebase.json + .firebaserc + deploy ✅ Task 9
- Section 7 (Admin Bootstrap): bootstrap_admin.py + Cloud Run jobs ✅ Task 7
- Section 8 (User Management): Users page CRUD + roles ✅ Task 8

**Placeholder scan:** None found. All code is complete and specific.

**Type consistency:**
- `apiFetch<T>` used consistently throughout Tasks 6 and 8
- `AppUser` with `firebaseUid` and `roleId` (camelCase) matches the transform in `apiFetch`
- `deleteJobLineItemsByJobId` references `jobLineItems` state, which is in scope via closure
- `ProtectedRoute` uses `user` + `loading` matching `AuthContextValue` in Task 3

**Snake↔camel note:** The backend sends `firebase_uid` → `apiFetch` transforms to `firebaseUid`. The Users page sends `firebaseUid` → `apiFetch` transforms to `firebase_uid`. This round-trip is handled entirely in `api.ts`.
