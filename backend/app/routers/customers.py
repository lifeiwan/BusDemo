from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_permission
from app.models.user import User
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


def _get_or_404(db, record_id, company_id):
    obj = db.query(Customer).filter(
        Customer.id == record_id, Customer.company_id == company_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    return obj


@router.get("/", response_model=list[CustomerRead])
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return db.query(Customer).filter(Customer.company_id == user.company_id).all()


@router.post("/", response_model=CustomerRead, status_code=201)
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = Customer(company_id=user.company_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "read")),
):
    return _get_or_404(db, customer_id, user.company_id)


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, customer_id, user.company_id)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("master-data", "write")),
):
    obj = _get_or_404(db, customer_id, user.company_id)
    db.delete(obj)
    db.commit()
