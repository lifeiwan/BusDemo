"""
One-off script: show all users and their roles, optionally assign admin role.

Usage:
    export DATABASE_URL=postgresql://...
    python -m seed.fix_user_role                        # just list users
    python -m seed.fix_user_role admin@example.com      # set that email to admin
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


def fix(target_email: str | None = None):
    from app.models.user import User, Role

    with Session(engine) as db:
        roles = {r.id: r.name for r in db.query(Role).all()}
        users = db.query(User).all()

        print(f"Found {len(users)} users:")
        for u in users:
            role_name = roles.get(u.role_id, "NO ROLE")
            print(f"  id={u.id}  email={u.email}  firebase_uid={u.firebase_uid}  role={role_name}(id={u.role_id})  active={u.is_active}")

        if not target_email:
            print("\nTo make a user admin, run:")
            print("  python -m seed.fix_user_role <email>")
            return

        admin_role = db.query(Role).filter_by(name="admin").first()
        if not admin_role:
            print("ERROR: No admin role found!")
            return

        user = db.query(User).filter_by(email=target_email).first()
        if not user:
            print(f"ERROR: No user with email {target_email}")
            return

        old_role = roles.get(user.role_id, "none")
        user.role_id = admin_role.id
        db.commit()
        print(f"\nUpdated {target_email}: {old_role} → admin")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    fix(target)
