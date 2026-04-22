from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User, Role
from app.schemas.user import (
    RoleCreate, RoleRead, RoleUpdate,
    UserCreate, UserRead, UserUpdate,
)

roles_router = APIRouter(prefix="/roles", tags=["users"])
users_router = APIRouter(prefix="/users", tags=["users"])


def _get_role_or_404(db, role_id, company_id):
    obj = db.query(Role).filter(
        Role.id == role_id, Role.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Role not found")
    return obj


def _get_user_or_404(db, user_id, company_id):
    obj = db.query(User).filter(
        User.id == user_id, User.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="User not found")
    return obj


# ── Roles ─────────────────────────────────────────────────────────────────────

@roles_router.get("/", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "read")),
):
    return db.query(Role).filter(Role.company_id == user.company_id).all()


@roles_router.post("/", response_model=RoleRead, status_code=201)
def create_role(
    body: RoleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = Role(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@roles_router.get("/{role_id}", response_model=RoleRead)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "read")),
):
    return _get_role_or_404(db, role_id, user.company_id)


@roles_router.put("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = _get_role_or_404(db, role_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@roles_router.delete("/{role_id}", status_code=204)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("users", "write")),
):
    obj = _get_role_or_404(db, role_id, user.company_id)
    db.delete(obj)
    db.commit()


# ── Users ─────────────────────────────────────────────────────────────────────

@users_router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return db.query(User).filter(User.company_id == current_user.company_id).all()


@users_router.post("/", response_model=UserRead, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = User(company_id=current_user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "read")),
):
    return _get_user_or_404(db, user_id, current_user.company_id)


@users_router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@users_router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users", "write")),
):
    obj = _get_user_or_404(db, user_id, current_user.company_id)
    db.delete(obj)
    db.commit()
