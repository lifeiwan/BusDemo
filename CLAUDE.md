# CLAUDE.md

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Repository Overview

BusDemo is a full-stack transportation accounting app. Frontend is a React SPA deployed to Firebase Hosting; backend is a FastAPI service deployed to Google Cloud Run backed by PostgreSQL.

- **Firebase project**: `superbusaccounting`
- **Deployed API**: `https://superbus-api-78224080031.us-central1.run.app`
- **Deployed frontend**: `https://superbusaccounting.web.app`

---

## Commands

### Frontend (`frontend/`)

```bash
npm run dev        # Dev server with HMR
npm run build      # TypeScript check + production build (dist/)
npm run lint       # ESLint
npm run preview    # Preview the production build locally
```

**Deploy frontend:**
```bash
npm run build && firebase deploy --only hosting
```

### Backend (`backend/`)

```bash
docker-compose up                            # Start PostgreSQL + API locally
uvicorn app.main:app --host 0.0.0.0 --port 8080  # Run API directly

pytest                                       # All backend tests
pytest backend/tests/test_vehicles.py -v    # Single test file, verbose

alembic upgrade head                         # Apply pending migrations
alembic revision --autogenerate -m "msg"    # Generate migration from model changes
alembic downgrade -1                         # Rollback last migration
```

**Deploy backend** (Google Cloud Run):
```bash
docker build -t superbus-api .
gcloud run deploy
```

**Seed / admin scripts:**
```bash
python -m seed.seed
python -m seed.bootstrap_admin
```

---

## Architecture

### Frontend

**State management:** Two React contexts hold all app state.
- `AuthContext` (`src/context/AuthContext.tsx`) — Firebase auth state + role from `/api/v1/users/me`. Provides `login`, `logout`, `appRole`.
- `DataContext` (`src/context/DataContext.tsx`) — On mount, fires ~15 parallel `apiFetch` calls for all entities. Exposes CRUD functions for each entity type. Components call `useData()` to read and mutate.

**API layer:** `src/lib/api.ts` — `apiFetch<T>()` injects the Firebase ID token as a Bearer header and performs automatic bidirectional camelCase ↔ snake_case transformation on all payloads.

**Routing & permissions:** `src/lib/permissions.ts` defines four roles (`admin`, `manager`, `investor`, `staff`) and two maps (`VIEW_MAP`, `EDIT_MAP`) keyed by section (`ops`, `master`, `profit`, `reports`, `admin`). Route guards use `canViewSection` / `canEdit`. Always check this file before adding role-gated UI.

**Navigation active-state logic:** `TopNav.tsx` and `Sidebar.tsx` both hardcode that `/master/ga-expenses` belongs to the *Profit Center* section, not Master Data. If you add more cross-section routes, replicate this pattern in both files.

**Profitability calculations** (`src/lib/profit.ts`) — All revenue/profit math runs client-side from the DataContext snapshot. Key rules:
- Only jobs with `status === 'completed'` are counted.
- Date strings are compared lexicographically (`'YYYY-MM-DD'`). Never use `new Date('YYYY-MM-DD')` — it parses as UTC midnight and gives the wrong day for US Eastern users. Use `new Date(y, m-1, d)` (local-time constructor) or the `parseLocalDate` / `todayStr` utilities in `src/lib/date.ts`.

**i18n:** Three locale files — `src/i18n/locales/en.ts`, `zh.ts`, `es.ts`. All three must be updated together whenever translation keys are added or removed.

### Backend

**Entry point:** `app/main.py` — initializes Firebase Admin SDK, adds CORS middleware, registers all routers under `/api/v1`.

**Auth flow:** Every protected endpoint depends on `get_current_user()` (`app/middleware/auth.py`), which verifies the Firebase ID token and loads the User row (with role + permissions) from PostgreSQL. `require_permission(resource, action)` is a factory that returns a Depends-compatible checker.

**Permissions model:** Many-to-many between Role and Permission. Resources: `operations`, `master-data`, `vehicle-ops`, `ga-expenses`, `profit-center`, `reports`, `users`. A `write` permission implies `read`.

**Schema conventions:** Backend uses `snake_case`; the frontend `apiFetch` transforms to `camelCase` transparently. Pydantic schemas follow `*Create` / `*Read` / `*Update` naming.

**Multi-tenancy:** All entity models carry a `company_id` foreign key.

**CORS note:** A CORS error in the browser is often masking a backend 500. Cloud Run returns 500 responses without CORS headers, so the browser reports it as a CORS failure. Always check the backend logs first.

---

## Key Conventions

- **Date safety:** Use `src/lib/date.ts` utilities (`todayStr`, `parseLocalDate`) everywhere a local date string is needed. Never use `new Date().toISOString().slice(0, 10)` — it can give tomorrow's date for NYC users between midnight and 4 AM local time.
- **Job IDs:** Never compute a job ID client-side. `addJob` in DataContext returns `Promise<Job>` with the real server-assigned ID. Use `created.id` for any follow-up requests (e.g., line items).
- **Profitability only counts completed jobs.** The `activeJobs` helper in `profit.ts` filters `status === 'completed'`. Dashboard shows `status === 'active'` jobs awaiting data entry — these are intentionally different lists.
- **Build before deploy.** Always run `npm run build` (TypeScript check is included) before `firebase deploy`.
