"""
One-off script: ensure the admin role has ALL permissions.
Prints what it adds so we can verify.

Usage:
    export DATABASE_URL=postgresql://...
    python -m seed.fix_admin_permissions
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


def fix():
    from app.models.user import User, Role, Permission, RolePermission

    with Session(engine) as db:
        # Show all roles and their current permissions
        roles = db.query(Role).all()
        print(f"Found {len(roles)} roles:")
        for role in roles:
            rps = db.query(RolePermission).filter_by(role_id=role.id).all()
            perm_ids = {rp.permission_id for rp in rps}
            perms = db.query(Permission).filter(Permission.id.in_(perm_ids)).all()
            perm_list = sorted(f"{p.resource}:{p.action}" for p in perms)
            print(f"  {role.name} (id={role.id}): {perm_list}")

        # Get admin role
        admin_role = db.query(Role).filter_by(name="admin").first()
        if not admin_role:
            print("ERROR: No admin role found!")
            return

        # Get ALL permissions
        all_perms = db.query(Permission).all()
        print(f"\nAll permissions in DB: {sorted(f'{p.resource}:{p.action}' for p in all_perms)}")

        # Find existing RolePermissions for admin
        existing = {
            rp.permission_id
            for rp in db.query(RolePermission).filter_by(role_id=admin_role.id).all()
        }
        print(f"\nAdmin already has {len(existing)}/{len(all_perms)} permissions")

        # Add missing ones
        added = 0
        for perm in all_perms:
            if perm.id not in existing:
                db.add(RolePermission(role_id=admin_role.id, permission_id=perm.id))
                print(f"  Adding: {perm.resource}:{perm.action}")
                added += 1

        db.commit()
        print(f"\nDone. Added {added} missing permissions to admin role.")

        # Show admin's users
        admins = db.query(User).filter_by(role_id=admin_role.id).all()
        print(f"Users with admin role: {[u.email for u in admins]}")


if __name__ == "__main__":
    fix()
