"""
Seed script: loads all EvaBus frontend static data into the database.
Idempotent — skips records that already exist.

Usage:
    export DATABASE_URL=postgresql://evabus:evabus@localhost:5432/evabus
    python -m seed.seed
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)


def seed():
    from app.models import (
        Base, Company, Permission, Role, RolePermission, User,
        Vehicle, VehicleFixedCost, InsurancePolicy, ParkingEntry,
        MaintenanceEntry, FuelEntry, Inspection,
        Driver, DriverVehicleAssignment, DriverCost,
        Customer, JobGroup, Job, JobLineItem, GaEntry,
    )

    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        # ── Company ───────────────────────────────────────────
        company = db.query(Company).first()
        if not company:
            company = Company(name="EvaBus LLC")
            db.add(company)
            db.flush()
            print(f"Created company: {company.name} (id={company.id})")
        else:
            print(f"Company already exists (id={company.id})")

        cid = company.id

        # ── RBAC: Permissions ─────────────────────────────────
        PERMISSIONS = [
            ("operations",   "read"),
            ("operations",   "write"),
            ("master-data",  "read"),
            ("master-data",  "write"),
            ("vehicle-ops",  "read"),
            ("vehicle-ops",  "write"),
            ("ga-expenses",  "read"),
            ("ga-expenses",  "write"),
            ("profit-center","read"),
            ("profit-center","write"),
            ("reports",      "read"),
            ("reports",      "write"),
            ("users",        "read"),
            ("users",        "write"),
        ]

        perm_map: dict[tuple, Permission] = {}
        for resource, action in PERMISSIONS:
            p = db.query(Permission).filter_by(resource=resource, action=action).first()
            if not p:
                p = Permission(resource=resource, action=action)
                db.add(p)
                db.flush()
            perm_map[(resource, action)] = p

        # ── RBAC: Roles + their permissions ───────────────────
        ROLE_PERMS = {
            "admin": list(perm_map.values()),  # all permissions
            "investor": [
                perm_map[("operations",    "read")],
                perm_map[("master-data",   "read")],
                perm_map[("vehicle-ops",   "read")],
                perm_map[("ga-expenses",   "read")],
                perm_map[("profit-center", "read")],
                perm_map[("reports",       "read")],
            ],
            "manager": [
                perm_map[("operations",    "read")],
                perm_map[("operations",    "write")],
                perm_map[("master-data",   "read")],
                perm_map[("master-data",   "write")],
                perm_map[("vehicle-ops",   "read")],
                perm_map[("vehicle-ops",   "write")],
                perm_map[("ga-expenses",   "read")],
                perm_map[("ga-expenses",   "write")],
                perm_map[("profit-center", "read")],
                perm_map[("profit-center", "write")],
                perm_map[("reports",       "read")],
                perm_map[("reports",       "write")],
            ],
            "staff": [
                perm_map[("operations",   "read")],
                perm_map[("operations",   "write")],
                perm_map[("master-data",  "read")],
                perm_map[("master-data",  "write")],
                perm_map[("vehicle-ops",  "read")],
                perm_map[("vehicle-ops",  "write")],
                perm_map[("ga-expenses",  "read")],
                perm_map[("ga-expenses",  "write")],
            ],
        }

        role_map: dict[str, Role] = {}
        for role_name, perms in ROLE_PERMS.items():
            role = db.query(Role).filter_by(company_id=cid, name=role_name).first()
            if not role:
                role = Role(company_id=cid, name=role_name)
                db.add(role)
                db.flush()
                for perm in perms:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                print(f"Created role: {role_name}")
            role_map[role_name] = role

        # ── Customers ─────────────────────────────────────────
        CUSTOMERS = [
            dict(name="Metro Transit Authority", contact_name="James Wilson",    email="jwilson@metro.gov",    phone="212-555-0101"),
            dict(name="Greenway School District",contact_name="Patricia Chen",   email="pchen@greenway.edu",   phone="718-555-0102"),
            dict(name="Harbor Cruise Lines",     contact_name="Robert Martinez", email="rmartinez@harbor.com", phone="646-555-0103"),
            dict(name="City Airport Shuttle",    contact_name="Linda Thompson",  email="lthompson@shuttle.com",phone="917-555-0104"),
            dict(name="Corporate Express Inc",   contact_name="Michael Brown",   email="mbrown@corpexp.com",   phone="212-555-0105"),
        ]
        cust_ids: list[int] = []
        for c in CUSTOMERS:
            obj = db.query(Customer).filter_by(company_id=cid, name=c["name"]).first()
            if not obj:
                obj = Customer(company_id=cid, **c, notes="")
                db.add(obj)
                db.flush()
            cust_ids.append(obj.id)

        # ── Vehicles ──────────────────────────────────────────
        VEHICLES = [
            dict(year=2019, make="Blue Bird",   model="Vision",   license_plate="ABC-1234", vin="1BAKBCPA5KF123456", status="active",       mileage=145230, color="Yellow"),
            dict(year=2020, make="IC Bus",      model="CE Series",license_plate="DEF-5678", vin="4DRBUAAN5LB234567", status="active",       mileage=98450,  color="White"),
            dict(year=2018, make="Thomas Built",model="Saf-T-Liner",license_plate="GHI-9012",vin="4UZABRFE5JCAA3456",status="maintenance",  mileage=210870, color="Yellow"),
            dict(year=2021, make="Blue Bird",   model="All American",license_plate="JKL-3456",vin="1BAKBCPA6MF456789",status="active",      mileage=67890,  color="Yellow"),
            dict(year=2017, make="IC Bus",      model="RE Series",license_plate="MNO-7890", vin="4DRBUABN3HB567890", status="out_of_service",mileage=287650, color="White"),
            dict(year=2022, make="Thomas Built",model="Jouley",   license_plate="PQR-1234", vin="4UZABRFE6NCAB6789", status="active",       mileage=34210,  color="White"),
            dict(year=2020, make="Blue Bird",   model="Micro Bird",license_plate="STU-5678", vin="1BAKBCPA7KF789012",status="active",       mileage=78930,  color="Yellow"),
            dict(year=2019, make="IC Bus",      model="CE Series",license_plate="VWX-9012", vin="4DRBUAAN6KB890123", status="active",       mileage=156780, color="White"),
            dict(year=2021, make="Thomas Built",model="Saf-T-Liner",license_plate="YZA-3456",vin="4UZABRFE7MCAB9012",status="active",       mileage=45670,  color="Yellow"),
            dict(year=2018, make="Blue Bird",   model="Vision",   license_plate="BCD-7890", vin="1BAKBCPA8JF901234", status="active",       mileage=198340, color="Yellow"),
        ]
        vehicle_ids: list[int] = []
        for v in VEHICLES:
            obj = db.query(Vehicle).filter_by(company_id=cid, license_plate=v["license_plate"]).first()
            if not obj:
                obj = Vehicle(company_id=cid, **v)
                db.add(obj)
                db.flush()
            vehicle_ids.append(obj.id)

        # ── Drivers ───────────────────────────────────────────
        DRIVERS = [
            dict(name="Michael Johnson", license="CDL-789012", license_expiry="2025-08-15", phone="212-555-0201", status="active"),
            dict(name="Sarah Williams",  license="CDL-456789", license_expiry="2026-03-22", phone="718-555-0202", status="active"),
            dict(name="Robert Davis",    license="CDL-123456", license_expiry="2024-11-30", phone="646-555-0203", status="active"),
            dict(name="Emily Chen",      license="CDL-321654", license_expiry="2026-07-18", phone="917-555-0204", status="active"),
            dict(name="James Wilson",    license="CDL-654321", license_expiry="2025-02-28", phone="212-555-0205", status="inactive"),
            dict(name="Maria Garcia",    license="CDL-987654", license_expiry="2026-11-05", phone="718-555-0206", status="active"),
            dict(name="David Martinez",  license="CDL-147258", license_expiry="2025-09-12", phone="646-555-0207", status="active"),
            dict(name="Lisa Anderson",   license="CDL-258369", license_expiry="2026-01-25", phone="917-555-0208", status="active"),
        ]
        driver_ids: list[int] = []
        for d in DRIVERS:
            obj = db.query(Driver).filter_by(company_id=cid, name=d["name"]).first()
            if not obj:
                obj = Driver(company_id=cid, **d)
                db.add(obj)
                db.flush()
            driver_ids.append(obj.id)

        # ── Job Groups ────────────────────────────────────────
        JOB_GROUPS = [
            dict(name="School District Routes",  type="route",    description="Regular school bus routes for Greenway School District"),
            dict(name="Airport Shuttle Service", type="route",    description="Daily airport shuttle service contracts"),
            dict(name="Charter & Special Events",type="one_time", description="One-time charter bookings and special events"),
            dict(name="Corporate Contracts",     type="route",    description="Regular corporate shuttle services"),
            dict(name="City Transit Support",    type="route",    description="Metro Transit Authority support routes"),
        ]
        jg_ids: list[int] = []
        for jg in JOB_GROUPS:
            obj = db.query(JobGroup).filter_by(company_id=cid, name=jg["name"]).first()
            if not obj:
                obj = JobGroup(company_id=cid, **jg)
                db.add(obj)
                db.flush()
            jg_ids.append(obj.id)

        # ── Vehicle Fixed Costs ───────────────────────────────
        # 3 per vehicle: loan, eld, management_fee
        FIXED_COST_TEMPLATES = [
            dict(type="loan",           costs=[1200, 1450, 800, 1350, 950, 1100, 1050, 1250, 1300, 1150]),
            dict(type="eld",            costs=[40,   45,   35,  42,   38,  44,   41,   43,   39,   40  ]),
            dict(type="management_fee", costs=[150,  150,  150, 150,  150, 150,  150,  150,  150,  150 ]),
        ]
        for template in FIXED_COST_TEMPLATES:
            for i, vid in enumerate(vehicle_ids):
                exists = db.query(VehicleFixedCost).filter_by(
                    company_id=cid, vehicle_id=vid, type=template["type"]
                ).first()
                if not exists:
                    db.add(VehicleFixedCost(
                        company_id=cid, vehicle_id=vid,
                        type=template["type"],
                        cost=template["costs"][i],
                        start_date="2024-01-01", notes="",
                    ))

        # ── Jobs ──────────────────────────────────────────────
        JOBS = [
            dict(name="Route 1 - Elementary",    job_group_id=jg_ids[0], vehicle_id=vehicle_ids[0], driver_id=driver_ids[0], customer_id=cust_ids[1], revenue=8500,  driver_payroll=3200, payments_received=8500,  recurrence="daily",   start_date="2024-09-01", end_date="2025-06-30", status="active"),
            dict(name="Route 2 - High School",   job_group_id=jg_ids[0], vehicle_id=vehicle_ids[1], driver_id=driver_ids[1], customer_id=cust_ids[1], revenue=7800,  driver_payroll=2900, payments_received=7800,  recurrence="daily",   start_date="2024-09-01", end_date="2025-06-30", status="active"),
            dict(name="JFK Morning Shuttle",      job_group_id=jg_ids[1], vehicle_id=vehicle_ids[3], driver_id=driver_ids[3], customer_id=cust_ids[3], revenue=12000, driver_payroll=4200, payments_received=12000, recurrence="daily",   start_date="2024-01-01", end_date=None,         status="active"),
            dict(name="LGA Evening Shuttle",      job_group_id=jg_ids[1], vehicle_id=vehicle_ids[6], driver_id=driver_ids[6], customer_id=cust_ids[3], revenue=9500,  driver_payroll=3500, payments_received=9500,  recurrence="daily",   start_date="2024-01-01", end_date=None,         status="active"),
            dict(name="Wedding Charter - June",   job_group_id=jg_ids[2], vehicle_id=vehicle_ids[5], driver_id=driver_ids[5], customer_id=cust_ids[2], revenue=3500,  driver_payroll=600,  payments_received=3500,  recurrence="one_time",start_date="2025-06-14", end_date="2025-06-14", status="completed"),
            dict(name="Corporate HQ Shuttle",     job_group_id=jg_ids[3], vehicle_id=vehicle_ids[7], driver_id=driver_ids[7], customer_id=cust_ids[4], revenue=11000, driver_payroll=3800, payments_received=11000, recurrence="daily",   start_date="2024-03-01", end_date=None,         status="active"),
            dict(name="Route 15 - Downtown",      job_group_id=jg_ids[4], vehicle_id=vehicle_ids[8], driver_id=driver_ids[2], customer_id=cust_ids[0], revenue=15000, driver_payroll=5200, payments_received=15000, recurrence="daily",   start_date="2024-06-01", end_date=None,         status="active"),
            dict(name="Route 22 - Crosstown",     job_group_id=jg_ids[4], vehicle_id=vehicle_ids[9], driver_id=driver_ids[4], customer_id=cust_ids[0], revenue=13500, driver_payroll=4700, payments_received=13500, recurrence="daily",   start_date="2024-06-01", end_date=None,         status="active"),
        ]
        job_ids: list[int] = []
        for j in JOBS:
            obj = db.query(Job).filter_by(company_id=cid, name=j["name"]).first()
            if not obj:
                obj = Job(company_id=cid, **j)
                db.add(obj)
                db.flush()
            job_ids.append(obj.id)

        # ── G&A Entries (2025 + 2026) ─────────────────────────
        GA_ENTRIES = [
            # 2025 entries (sample — one per month per major category)
            dict(category="Office Rent",      date="2025-01-01", amount=2500),
            dict(category="Office Rent",      date="2025-02-01", amount=2500),
            dict(category="Office Rent",      date="2025-03-01", amount=2500),
            dict(category="Office Rent",      date="2025-04-01", amount=2500),
            dict(category="Office Rent",      date="2025-05-01", amount=2500),
            dict(category="Office Rent",      date="2025-06-01", amount=2500),
            dict(category="Office Rent",      date="2025-07-01", amount=2500),
            dict(category="Office Rent",      date="2025-08-01", amount=2500),
            dict(category="Office Rent",      date="2025-09-01", amount=2500),
            dict(category="Office Rent",      date="2025-10-01", amount=2500),
            dict(category="Office Rent",      date="2025-11-01", amount=2500),
            dict(category="Office Rent",      date="2025-12-01", amount=2500),
            dict(category="Salaries",         date="2025-01-15", amount=8000),
            dict(category="Salaries",         date="2025-02-15", amount=8000),
            dict(category="Salaries",         date="2025-03-15", amount=8000),
            dict(category="Salaries",         date="2025-04-15", amount=8200),
            dict(category="Utilities",        date="2025-01-10", amount=320),
            dict(category="Utilities",        date="2025-02-10", amount=310),
            dict(category="Accounting & Tax", date="2025-03-20", amount=1500),
            dict(category="Insurance (G&A)",  date="2025-01-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-02-01", amount=600),
            # 2026 entries
            dict(category="Office Rent",      date="2026-01-01", amount=2600),
            dict(category="Office Rent",      date="2026-02-01", amount=2600),
            dict(category="Office Rent",      date="2026-03-01", amount=2600),
            dict(category="Office Rent",      date="2026-04-01", amount=2600),
            dict(category="Salaries",         date="2026-01-15", amount=8500),
            dict(category="Salaries",         date="2026-02-15", amount=8500),
            dict(category="Salaries",         date="2026-03-15", amount=8500),
            dict(category="Salaries",         date="2026-04-15", amount=8500),
            dict(category="Utilities",        date="2026-01-10", amount=350),
            dict(category="Utilities",        date="2026-02-10", amount=340),
            dict(category="Utilities",        date="2026-03-10", amount=360),
            dict(category="Accounting & Tax", date="2026-01-25", amount=800),
            dict(category="Insurance (G&A)",  date="2026-01-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-02-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-03-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-04-01", amount=650),
        ]
        for entry in GA_ENTRIES:
            exists = db.query(GaEntry).filter_by(
                company_id=cid, category=entry["category"], date=entry["date"]
            ).first()
            if not exists:
                db.add(GaEntry(company_id=cid, notes="", **entry))

        db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
