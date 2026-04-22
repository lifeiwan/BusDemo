import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.auth import require_permission
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router

if not firebase_admin._apps:
    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})

app = FastAPI(title="EvaBus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(vehicles_router.router, prefix="/api/v1")

for _r in (
    vehicle_ops_router.maint,
    vehicle_ops_router.fuel,
    vehicle_ops_router.insp,
    vehicle_ops_router.ins,
    vehicle_ops_router.park,
    vehicle_ops_router.vfc,
    vehicle_ops_router.dcosts,
):
    app.include_router(_r, prefix="/api/v1")

app.include_router(drivers_router.router, prefix="/api/v1")
app.include_router(drivers_router.assign_router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")


# Stub route — removed in Task 8
@app.get("/api/v1/reports/pl", dependencies=[Depends(require_permission("reports", "read"))])
def pl_report_stub():
    return {}
