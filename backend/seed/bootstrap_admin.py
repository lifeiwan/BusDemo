"""
Bootstrap the initial admin user.
Run once after the first migration + seed.

Usage (locally):
  DATABASE_URL=... ADMIN_FIREBASE_UID=xxx ADMIN_EMAIL=you@example.com python -m seed.bootstrap_admin

Usage (Cloud Run job):
  gcloud run jobs execute superbus-bootstrap --region=us-central1 --wait \
    --update-env-vars ADMIN_FIREBASE_UID=xxx,ADMIN_EMAIL=you@example.com
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.user import Role, User


engine = create_engine(os.environ["DATABASE_URL"])


def bootstrap():
    uid = os.environ["ADMIN_FIREBASE_UID"]
    email = os.environ["ADMIN_EMAIL"]

    with Session(engine) as db:
        company = db.query(Company).first()
        if not company:
            raise RuntimeError("Run seed.py first — no company found.")

        role = db.query(Role).filter_by(company_id=company.id, name="admin").first()
        if not role:
            raise RuntimeError("Run seed.py first — admin role not found.")

        existing = db.query(User).filter_by(firebase_uid=uid).first()
        if existing:
            print(f"Admin user already exists (id={existing.id})")
            return

        user = User(
            company_id=company.id,
            role_id=role.id,
            firebase_uid=uid,
            email=email,
        )
        db.add(user)
        db.commit()
        print(f"Created admin user: {email} (firebase_uid={uid})")


if __name__ == "__main__":
    bootstrap()
