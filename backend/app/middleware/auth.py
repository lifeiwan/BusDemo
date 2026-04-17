from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.models.user import User, Permission, RolePermission

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = (
        db.query(User)
        .filter(User.firebase_uid == decoded["uid"], User.is_active == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def require_permission(resource: str, action: str):
    """
    FastAPI dependency factory. Usage:
        @router.get("/", dependencies=[Depends(require_permission("master-data", "read"))])
    """
    def checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        perms = (
            db.query(Permission)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .filter(RolePermission.role_id == user.role_id)
            .all()
        )
        granted = {(p.resource, p.action) for p in perms}

        # 'write' permission implies 'read'
        if action == "read":
            has_perm = (resource, "read") in granted or (resource, "write") in granted
        else:
            has_perm = (resource, action) in granted

        if not has_perm:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        return user

    return checker
