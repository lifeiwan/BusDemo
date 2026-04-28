import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.routers import vehicles as vehicles_router
from app.routers import vehicle_ops as vehicle_ops_router
from app.routers import drivers as drivers_router
from app.routers import customers as customers_router
from app.routers import jobs as jobs_router
from app.routers import ga as ga_router
from app.routers import users as users_router
from app.routers import reports as reports_router
from app.routers import profitability as profitability_router

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


@app.get("/debug/me")
def debug_me(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.user import Permission, RolePermission
    perms = (
        db.query(Permission)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .filter(RolePermission.role_id == current_user.role_id)
        .all()
    )
    return {
        "user_id": current_user.id,
        "firebase_uid": current_user.firebase_uid,
        "email": current_user.email,
        "role_id": current_user.role_id,
        "is_active": current_user.is_active,
        "permissions": sorted([(p.resource, p.action) for p in perms]),
    }


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
app.include_router(jobs_router.groups_router, prefix="/api/v1")
app.include_router(jobs_router.jobs_router, prefix="/api/v1")
app.include_router(jobs_router.items_router, prefix="/api/v1")
app.include_router(ga_router.router, prefix="/api/v1")
app.include_router(users_router.roles_router, prefix="/api/v1")
app.include_router(users_router.users_router, prefix="/api/v1")
app.include_router(reports_router.router, prefix="/api/v1")
app.include_router(profitability_router.router, prefix="/api/v1")
