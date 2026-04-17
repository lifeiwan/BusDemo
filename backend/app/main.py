import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission

# Initialize Firebase Admin SDK once at startup
if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        # In tests / local dev without credentials, initialize with project ID only
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # set to True with explicit origins before production (wildcard + credentials is rejected by browsers)
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Stub route used by auth tests — will be replaced in Plan 2
@app.get("/api/v1/vehicles", dependencies=[Depends(require_permission("master-data", "read"))])
def list_vehicles_stub():
    return []


# Stub route used by auth tests — will be replaced in Plan 2
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
