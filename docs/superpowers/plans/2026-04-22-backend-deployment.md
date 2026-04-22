# Backend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the FastAPI backend to Cloud Run with Cloud SQL (PostgreSQL 15) and Secret Manager on GCP project `project-4492076b-e4a4-4a4b-b5a`.

**Architecture:** Docker image pushed to Artifact Registry, Cloud Run service reads `DATABASE_URL` and `FIREBASE_PROJECT_ID` from Secret Manager and connects to Cloud SQL via Unix socket (Cloud SQL Auth Proxy built into Cloud Run). Alembic migrations run as a separate Cloud Run job after each deploy.

**Tech Stack:** gcloud CLI, Docker, Cloud Run, Cloud SQL (PostgreSQL 15), Artifact Registry, Secret Manager

---

## Constants (used throughout every task)

| Name | Value |
|---|---|
| `PROJECT_ID` | `project-4492076b-e4a4-4a4b-b5a` |
| `REGION` | `us-central1` |
| `SQL_INSTANCE` | `superbus-db` |
| `DATABASE` | `superbus` |
| `DB_USER` | `superbus` |
| `IMAGE` | `us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api` |
| `RUN_SERVICE` | `superbus-api` |
| `RUN_JOB` | `superbus-migrate` |
| `SERVICE_ACCOUNT` | `superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com` |

---

## File Map

**New files:**
- `backend/.env` — local development env vars (never committed)
- `backend/.gitignore` — ensure `.env` is listed (create or modify)

**No application code changes** — the Dockerfile and FastAPI app are already correct for Cloud Run (port 8080, reads `DATABASE_URL` and `FIREBASE_PROJECT_ID` from env).

---

### Task 1: Install gcloud CLI and authenticate

**Files:** none

- [ ] **Step 1: Check Docker is installed**

```bash
docker --version
```

Expected: `Docker version 24.x.x` or similar. If missing, install Docker Desktop from https://www.docker.com/products/docker-desktop/ before continuing.

- [ ] **Step 2: Install gcloud CLI**

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

When prompted:
- Installation directory: accept default (`~/google-cloud-sdk`)
- Modify shell profile to add gcloud to PATH: **Yes**
- Run `gcloud init` now: **No** (we'll configure manually)

- [ ] **Step 3: Verify gcloud is available**

```bash
gcloud version
```

Expected: first line is `Google Cloud SDK 500.x.x` or higher.

- [ ] **Step 4: Authenticate with your Google account**

```bash
gcloud auth login
```

A browser tab opens. Sign in with the Google account that owns the Firebase project `project-4492076b-e4a4-4a4b-b5a`.

- [ ] **Step 5: Set the active project**

```bash
gcloud config set project project-4492076b-e4a4-4a4b-b5a
```

Expected: `Updated property [core/project].`

- [ ] **Step 6: Configure Docker to authenticate with Artifact Registry**

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Expected: `Adding credentials for: us-central1-docker.pkg.dev`

- [ ] **Step 7: Verify everything is set**

```bash
gcloud config get project
```

Expected: `project-4492076b-e4a4-4a4b-b5a`

---

### Task 2: Enable required GCP APIs

**Files:** none

- [ ] **Step 1: Enable all required APIs**

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

Expected: `Operation "operations/..." finished successfully.`

This takes 30–60 seconds.

- [ ] **Step 2: Verify all APIs are enabled**

```bash
gcloud services list --enabled --filter="name:(run.googleapis.com OR sqladmin.googleapis.com OR artifactregistry.googleapis.com OR secretmanager.googleapis.com)"
```

Expected: 4 services listed, all with state `ENABLED`.

---

### Task 3: Create Artifact Registry repository

**Files:** none

- [ ] **Step 1: Create the Docker repository**

```bash
gcloud artifacts repositories create superbus \
  --repository-format=docker \
  --location=us-central1 \
  --description="SuperBus API images"
```

Expected: `Created repository [superbus].`

- [ ] **Step 2: Verify repository exists**

```bash
gcloud artifacts repositories describe superbus --location=us-central1
```

Expected: output shows `format: DOCKER` and `name: .../superbus`.

---

### Task 4: Create Cloud SQL instance, database, and user

**Files:** none

The instance takes 5–10 minutes to provision. Start it and wait.

- [ ] **Step 1: Create the Cloud SQL instance**

```bash
gcloud sql instances create superbus-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --no-assign-ip
```

Expected: `Created [https://sqladmin.googleapis.com/...].`

Wait for the instance to be ready (check every 30 seconds):

```bash
gcloud sql instances describe superbus-db --format="value(state)"
```

Expected: `RUNNABLE`

- [ ] **Step 2: Enable deletion protection**

```bash
gcloud sql instances patch superbus-db --deletion-protection
```

Expected: `Updated [https://sqladmin.googleapis.com/...].`

- [ ] **Step 3: Generate a strong password and save it**

```bash
DB_PASSWORD=$(openssl rand -base64 32)
echo "DB password (save this now, you need it in Task 5): $DB_PASSWORD"
```

**Copy and save this password somewhere safe.** It won't be shown again.

- [ ] **Step 4: Create the database**

```bash
gcloud sql databases create superbus --instance=superbus-db
```

Expected: `Created database [superbus].`

- [ ] **Step 5: Create the database user**

```bash
gcloud sql users create superbus \
  --instance=superbus-db \
  --password="$DB_PASSWORD"
```

Expected: `Created user [superbus].`

- [ ] **Step 6: Verify instance has no public IP**

```bash
gcloud sql instances describe superbus-db --format="value(state,settings.ipConfiguration.ipv4Enabled)"
```

Expected: `RUNNABLE  False`

---

### Task 5: Create Secret Manager secrets

**Files:** none

- [ ] **Step 1: Create the DATABASE_URL secret**

Replace `YOUR_PASSWORD` with the password from Task 4 Step 3:

```bash
echo -n "postgresql://superbus:YOUR_PASSWORD@/superbus?host=/cloudsql/project-4492076b-e4a4-4a4b-b5a:us-central1:superbus-db" | \
  gcloud secrets create superbus-database-url \
    --data-file=- \
    --replication-policy=automatic
```

Expected: `Created version [1] of the secret [superbus-database-url].`

- [ ] **Step 2: Create the FIREBASE_PROJECT_ID secret**

```bash
echo -n "project-4492076b-e4a4-4a4b-b5a" | \
  gcloud secrets create superbus-firebase-project-id \
    --data-file=- \
    --replication-policy=automatic
```

Expected: `Created version [1] of the secret [superbus-firebase-project-id].`

- [ ] **Step 3: Verify both secrets exist**

```bash
gcloud secrets list
```

Expected: both `superbus-database-url` and `superbus-firebase-project-id` listed.

---

### Task 6: Create service account and grant IAM roles

**Files:** none

- [ ] **Step 1: Create the service account**

```bash
gcloud iam service-accounts create superbus-api-sa \
  --display-name="SuperBus API Service Account"
```

Expected: `Created service account [superbus-api-sa].`

- [ ] **Step 2: Grant Cloud SQL Client role**

```bash
gcloud projects add-iam-policy-binding project-4492076b-e4a4-4a4b-b5a \
  --member="serviceAccount:superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

Expected: output shows `bindings` list including the new binding.

- [ ] **Step 3: Grant Secret Manager Secret Accessor role**

```bash
gcloud projects add-iam-policy-binding project-4492076b-e4a4-4a4b-b5a \
  --member="serviceAccount:superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Expected: output shows updated IAM policy.

- [ ] **Step 4: Verify the service account exists**

```bash
gcloud iam service-accounts describe \
  superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com
```

Expected: shows `displayName: SuperBus API Service Account` and `disabled: false`.

---

### Task 7: Build and push Docker image

**Files:**
- Read: `backend/Dockerfile` (already correct, no changes needed)

- [ ] **Step 1: Verify the Dockerfile looks correct**

```bash
cat /Users/lifeiwang/Documents/GitHub/BusDemo/backend/Dockerfile
```

Expected: last line is `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]`

- [ ] **Step 2: Build the Docker image**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend
docker build -t us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest .
```

Expected: final lines show `Successfully built <id>` and `Successfully tagged us-central1-docker.pkg.dev/...`

- [ ] **Step 3: Push the image to Artifact Registry**

```bash
docker push us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest
```

Expected: `latest: digest: sha256:... size: ...`

- [ ] **Step 4: Verify image is in the registry**

```bash
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus
```

Expected: one row with `TAG: latest`.

---

### Task 8: Deploy Cloud Run service

**Files:** none

- [ ] **Step 1: Deploy the Cloud Run service**

```bash
gcloud run deploy superbus-api \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1 \
  --service-account=superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com \
  --add-cloudsql-instances=project-4492076b-e4a4-4a4b-b5a:us-central1:superbus-db \
  --set-secrets=DATABASE_URL=superbus-database-url:latest,FIREBASE_PROJECT_ID=superbus-firebase-project-id:latest \
  --set-env-vars=FIREBASE_CREDENTIALS_PATH="" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --port=8080 \
  --allow-unauthenticated
```

When prompted `Allow unauthenticated invocations?`: type **y**. (The app enforces Firebase auth itself — Cloud Run's IAM auth is not needed on top.)

Expected final lines:
```
Service [superbus-api] revision [superbus-api-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://superbus-api-xxxxxxxxxxxx-uc.a.run.app
```

**Save the Service URL** — you'll need it in Task 10 and for the frontend.

- [ ] **Step 2: Verify the health endpoint responds**

Replace `SERVICE_URL` with the URL from Step 1:

```bash
curl https://SERVICE_URL/health
```

Expected: `{"status":"ok"}`

---

### Task 9: Create and run the migration job

**Files:** none

- [ ] **Step 1: Create the Cloud Run migration job**

```bash
gcloud run jobs create superbus-migrate \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1 \
  --service-account=superbus-api-sa@project-4492076b-e4a4-4a4b-b5a.iam.gserviceaccount.com \
  --add-cloudsql-instances=project-4492076b-e4a4-4a4b-b5a:us-central1:superbus-db \
  --set-secrets=DATABASE_URL=superbus-database-url:latest,FIREBASE_PROJECT_ID=superbus-firebase-project-id:latest \
  --set-env-vars=FIREBASE_CREDENTIALS_PATH="" \
  --command=alembic \
  --args=upgrade,head \
  --max-retries=1 \
  --region=us-central1
```

Expected: `Job [superbus-migrate] has been successfully created.`

- [ ] **Step 2: Run the migration job**

```bash
gcloud run jobs execute superbus-migrate --region=us-central1 --wait
```

Expected: `Execution [superbus-migrate-xxxxx] has successfully completed.`

This takes about 30–60 seconds.

- [ ] **Step 3: Check migration logs**

```bash
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=superbus-migrate" \
  --limit=30 \
  --format="value(textPayload)" \
  --order=asc
```

Expected: log lines mentioning `Running upgrade` and migration revision IDs. No `ERROR` lines.

---

### Task 10: Smoke test and local .env setup

**Files:**
- Create: `backend/.env`
- Modify: `backend/.gitignore`

- [ ] **Step 1: Confirm unauthenticated requests return 401**

Replace `SERVICE_URL` with your Cloud Run URL:

```bash
curl -s -o /dev/null -w "%{http_code}" https://SERVICE_URL/api/v1/vehicles/
```

Expected: `401`

This confirms the app is running and Firebase auth middleware is active.

- [ ] **Step 2: Ensure .env is gitignored**

```bash
grep -q "\.env" /Users/lifeiwang/Documents/GitHub/BusDemo/backend/.gitignore 2>/dev/null \
  || echo ".env" >> /Users/lifeiwang/Documents/GitHub/BusDemo/backend/.gitignore
```

No output means `.env` was already listed. If the file didn't exist, it's now created with `.env` inside.

- [ ] **Step 3: Create backend/.env for local development**

Create `/Users/lifeiwang/Documents/GitHub/BusDemo/backend/.env` with:

```
DATABASE_URL=postgresql://superbus:superbus@localhost:5432/superbus
FIREBASE_PROJECT_ID=project-4492076b-e4a4-4a4b-b5a
FIREBASE_CREDENTIALS_PATH=
```

Note: the local `DATABASE_URL` points to your local Postgres (via docker-compose). The production URL is in Secret Manager and never written to disk.

- [ ] **Step 4: Commit the .gitignore**

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo
git add backend/.gitignore
git commit -m "chore: gitignore backend .env"
```

---

## Ongoing Deploy Workflow

Every time you ship new code:

```bash
cd /Users/lifeiwang/Documents/GitHub/BusDemo/backend

# 1. Build and push
docker build -t us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest .
docker push us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest

# 2. Deploy
gcloud run deploy superbus-api \
  --image=us-central1-docker.pkg.dev/project-4492076b-e4a4-4a4b-b5a/superbus/api:latest \
  --region=us-central1

# 3. Migrate (only when Alembic migrations were added)
gcloud run jobs execute superbus-migrate --region=us-central1 --wait
```

---

## Self-Review

**Spec coverage:**
- Install gcloud + authenticate ✅ Task 1
- Enable APIs ✅ Task 2
- Artifact Registry (`superbus`) ✅ Task 3
- Cloud SQL `superbus-db`, db `superbus`, user `superbus`, no public IP, deletion protection ✅ Task 4
- Secret Manager (`superbus-database-url`, `superbus-firebase-project-id`) ✅ Task 5
- Service account `superbus-api-sa` with `cloudsql.client` + `secretmanager.secretAccessor` ✅ Task 6
- Build + push Docker image ✅ Task 7
- Cloud Run service with all settings (min=0, max=5, 512Mi, port 8080, Cloud SQL, secrets) ✅ Task 8
- Cloud Run migration job + execute ✅ Task 9
- Smoke test + local .env setup ✅ Task 10
- Ongoing deploy workflow ✅ documented above

**Placeholder scan:** `SERVICE_URL` and `YOUR_PASSWORD` are intentional — filled in by the engineer at runtime. No TBDs or TODOs.

**Type consistency:** All resource names consistent throughout (superbus-db, superbus-api, superbus-migrate, superbus-api-sa).
