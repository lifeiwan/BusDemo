# Backend Deployment Design

**Date:** 2026-04-22
**Status:** Approved

## Overview

Deploy the FastAPI backend to GCP Cloud Run backed by Cloud SQL (PostgreSQL), with secrets managed via Secret Manager. The frontend (Firebase Hosting) is a separate spec. Manual deploys for now; CI/CD added later.

---

## Architecture

```
Firebase Auth (authentication)
        │
        ▼
React frontend (Firebase Hosting)  ← separate spec
        │  HTTPS API calls
        ▼
Cloud Run (superbus-api)  ←── Secret Manager
        │                       ├── superbus-database-url
        │                       └── superbus-firebase-project-id
        ▼  Unix socket
Cloud SQL (superbus-db, PostgreSQL 15)
```

---

## GCP Region

All resources: `us-central1`

---

## Cloud SQL

| Setting | Value |
|---|---|
| Instance name | `superbus-db` |
| Engine | PostgreSQL 15 |
| Tier | `db-f1-micro` (~$7/month) |
| Region | `us-central1` |
| Database | `superbus` |
| User | `superbus` |
| Public IP | Disabled |
| Backups | Daily, 7-day retention |
| Deletion protection | Enabled |

Connection from Cloud Run uses Unix socket via Cloud SQL Auth Proxy (built into Cloud Run infrastructure).

`DATABASE_URL` format stored in Secret Manager:
```
postgresql://superbus:<password>@/superbus?host=/cloudsql/<project-id>:us-central1:superbus-db
```

---

## Artifact Registry

- **Repository name:** `superbus`
- **Region:** `us-central1`
- **Format:** Docker
- **Image path:** `us-central1-docker.pkg.dev/<project-id>/superbus/api`
- **Tagging:** `latest` for manual deploys; git commit SHA for CI/CD

---

## Cloud Run Service

| Setting | Value |
|---|---|
| Service name | `superbus-api` |
| Region | `us-central1` |
| Min instances | `0` (scales to zero) |
| Max instances | `5` |
| Memory | `512Mi` |
| CPU | `1` |
| Concurrency | `80` |
| Port | `8080` (matches Dockerfile) |
| Cloud SQL connection | `<project-id>:us-central1:superbus-db` |
| Service account | `superbus-api-sa` |

**Environment variables (from Secret Manager):**

| Variable | Secret name |
|---|---|
| `DATABASE_URL` | `superbus-database-url` |
| `FIREBASE_PROJECT_ID` | `superbus-firebase-project-id` |
| `FIREBASE_CREDENTIALS_PATH` | `""` (empty, set directly) |

---

## Cloud Run Job (Migrations)

| Setting | Value |
|---|---|
| Job name | `superbus-migrate` |
| Image | Same as `superbus-api` |
| Command | `alembic upgrade head` |
| Cloud SQL connection | `<project-id>:us-central1:superbus-db` |
| Service account | `superbus-api-sa` |

Run after each deploy with schema changes:
```bash
gcloud run jobs execute superbus-migrate --region us-central1 --wait
```

---

## Service Account

| Setting | Value |
|---|---|
| Name | `superbus-api-sa` |
| IAM roles | `roles/cloudsql.client`, `roles/secretmanager.secretAccessor` |

---

## Secret Manager Secrets

| Secret name | Contents |
|---|---|
| `superbus-database-url` | Full PostgreSQL connection string (Unix socket format) |
| `superbus-firebase-project-id` | Firebase project ID |

---

## One-Time Setup Sequence

1. Install `gcloud` CLI and authenticate (`gcloud auth login`, `gcloud config set project <project-id>`)
2. Enable APIs: `run.googleapis.com`, `sqladmin.googleapis.com`, `artifactregistry.googleapis.com`, `secretmanager.googleapis.com`
3. Create Artifact Registry repo (`superbus`)
4. Create Cloud SQL instance (`superbus-db`), database (`superbus`), user (`superbus`)
5. Create secrets in Secret Manager
6. Create service account (`superbus-api-sa`) with IAM roles
7. Build and push Docker image to Artifact Registry
8. Deploy Cloud Run service (`superbus-api`) with Cloud SQL + secrets wired in
9. Create Cloud Run job (`superbus-migrate`)
10. Run migrate job → creates all tables
11. Optionally run seed job

---

## Manual Deploy Workflow (ongoing)

```bash
# 1. Build and push image
docker build -t us-central1-docker.pkg.dev/<project-id>/superbus/api:latest ./backend
docker push us-central1-docker.pkg.dev/<project-id>/superbus/api:latest

# 2. Deploy to Cloud Run
gcloud run deploy superbus-api \
  --image us-central1-docker.pkg.dev/<project-id>/superbus/api:latest \
  --region us-central1

# 3. Run migrations (only if schema changed)
gcloud run jobs execute superbus-migrate --region us-central1 --wait
```

---

## Out of Scope

- CI/CD (Cloud Build trigger) — added later when ready
- Frontend Firebase Hosting deployment — separate spec
- Firebase Auth frontend integration — separate spec
- Custom domain / SSL certificate — added after initial deploy
