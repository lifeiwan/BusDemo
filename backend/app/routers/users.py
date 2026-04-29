from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.middleware.auth import require_permission, get_current_user
from app.models.user import User, Role
from app.schemas.user import (
    RoleCreate, RoleRead, RoleUpdate,
    UserCreate, UserRead, UserUpdate,
    UserMeRead,
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

@users_router.get("/me", response_model=UserMeRead)
def get_me(
    current_user: User = Depends(get_current_user),
):
    role = current_user.role  # loaded via SQLAlchemy relationship
    return UserMeRead(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role_id=current_user.role_id,
        role_name=role.name,
    )


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
    # Step 1: Create Firebase Auth account
    try:
        firebase_user = firebase_auth.create_user(
            email=body.email,
            password=body.password,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=409,
            detail="A Firebase account with this email already exists",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Firebase account: {str(e)}",
        )

    # Step 2: Insert DB record using Firebase-generated UID
    try:
        obj = User(
            company_id=current_user.company_id,
            firebase_uid=firebase_user.uid,
            email=body.email,
            name=body.name,
            role_id=body.role_id,
            is_active=body.is_active,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj
    except Exception as e:
        # Rollback: delete the Firebase account so it doesn't become an orphan
        try:
            firebase_auth.delete_user(firebase_user.uid)
        except Exception:
            pass  # best-effort cleanup
        raise HTTPException(
            status_code=500,
            detail="User created in Firebase but database insert failed",
        )


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
