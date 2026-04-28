"""
Seed script: loads testing data into the database.
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
            "admin": list(perm_map.values()),
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
                print(f"Created role: {role_name}")
            existing_perm_ids = {
                rp.permission_id
                for rp in db.query(RolePermission).filter_by(role_id=role.id).all()
            }
            for perm in perms:
                if perm.id not in existing_perm_ids:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
            role_map[role_name] = role

        # ── Customers ─────────────────────────────────────────
        CUSTOMERS = [
            dict(name="Metro Transit Authority",  contact_name="James Wilson",    email="jwilson@metro.gov",     phone="212-555-0101"),
            dict(name="Greenway School District", contact_name="Patricia Chen",   email="pchen@greenway.edu",    phone="718-555-0102"),
            dict(name="Harbor Cruise Lines",      contact_name="Robert Martinez", email="rmartinez@harbor.com",  phone="646-555-0103"),
            dict(name="City Airport Shuttle",     contact_name="Linda Thompson",  email="lthompson@shuttle.com", phone="917-555-0104"),
            dict(name="Corporate Express Inc",    contact_name="Michael Brown",   email="mbrown@corpexp.com",    phone="212-555-0105"),
            dict(name="Riverside Medical Center", contact_name="Sandra Lee",      email="slee@riverside.org",    phone="718-555-0106"),
            dict(name="Eastside Events Co",       contact_name="Tom Park",        email="tpark@eastside.com",    phone="646-555-0107"),
        ]
        cust_ids: list[int] = []
        for c in CUSTOMERS:
            obj = db.query(Customer).filter_by(company_id=cid, name=c["name"]).first()
            if not obj:
                obj = Customer(company_id=cid, **c, notes="")
                db.add(obj)
                db.flush()
            cust_ids.append(obj.id)
        # aliases for readability below
        c_metro, c_school, c_harbor, c_airport, c_corp, c_medical, c_events = cust_ids

        # ── Vehicles ──────────────────────────────────────────
        VEHICLES = [
            dict(year=2019, make="Blue Bird",    model="Vision",       license_plate="ABC-1234", vin="1BAKBCPA5KF123456", status="active",         mileage=145230, color="Yellow"),
            dict(year=2020, make="IC Bus",       model="CE Series",    license_plate="DEF-5678", vin="4DRBUAAN5LB234567", status="active",         mileage=98450,  color="White"),
            dict(year=2018, make="Thomas Built", model="Saf-T-Liner",  license_plate="GHI-9012", vin="4UZABRFE5JCAA3456", status="maintenance",    mileage=210870, color="Yellow"),
            dict(year=2021, make="Blue Bird",    model="All American", license_plate="JKL-3456", vin="1BAKBCPA6MF456789", status="active",         mileage=67890,  color="Yellow"),
            dict(year=2017, make="IC Bus",       model="RE Series",    license_plate="MNO-7890", vin="4DRBUABN3HB567890", status="out_of_service", mileage=287650, color="White"),
            dict(year=2022, make="Thomas Built", model="Jouley",       license_plate="PQR-1234", vin="4UZABRFE6NCAB6789", status="active",         mileage=34210,  color="White"),
            dict(year=2020, make="Blue Bird",    model="Micro Bird",   license_plate="STU-5678", vin="1BAKBCPA7KF789012", status="active",         mileage=78930,  color="Yellow"),
            dict(year=2019, make="IC Bus",       model="CE Series",    license_plate="VWX-9012", vin="4DRBUAAN6KB890123", status="active",         mileage=156780, color="White"),
            dict(year=2021, make="Thomas Built", model="Saf-T-Liner",  license_plate="YZA-3456", vin="4UZABRFE7MCAB9012", status="active",         mileage=45670,  color="Yellow"),
            dict(year=2018, make="Blue Bird",    model="Vision",       license_plate="BCD-7890", vin="1BAKBCPA8JF901234", status="active",         mileage=198340, color="Yellow"),
        ]
        vehicle_ids: list[int] = []
        for v in VEHICLES:
            obj = db.query(Vehicle).filter_by(company_id=cid, license_plate=v["license_plate"]).first()
            if not obj:
                obj = Vehicle(company_id=cid, **v)
                db.add(obj)
                db.flush()
            vehicle_ids.append(obj.id)
        v0, v1, v2, v3, v4, v5, v6, v7, v8, v9 = vehicle_ids

        # ── Drivers ───────────────────────────────────────────
        DRIVERS = [
            dict(name="Michael Johnson", license="CDL-789012", license_expiry="2027-08-15", phone="212-555-0201", status="active"),
            dict(name="Sarah Williams",  license="CDL-456789", license_expiry="2026-03-22", phone="718-555-0202", status="active"),
            dict(name="Robert Davis",    license="CDL-123456", license_expiry="2026-11-30", phone="646-555-0203", status="active"),
            dict(name="Emily Chen",      license="CDL-321654", license_expiry="2026-07-18", phone="917-555-0204", status="active"),
            dict(name="James Wilson",    license="CDL-654321", license_expiry="2027-02-28", phone="212-555-0205", status="active"),
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
        d0, d1, d2, d3, d4, d5, d6, d7 = driver_ids

        # ── Job Groups (templates) ────────────────────────────
        JOB_GROUPS = [
            dict(name="School District Routes",   type="route",    description="Regular school bus routes for Greenway School District", customer_id=c_school,  vehicle_id=v0,  default_revenue=850,  default_driver_payroll=320, recurrence="daily"),
            dict(name="Airport Shuttle Service",  type="route",    description="Daily airport shuttle service contracts",                 customer_id=c_airport, vehicle_id=v3,  default_revenue=1200, default_driver_payroll=420, recurrence="daily"),
            dict(name="Charter & Special Events", type="one_time", description="One-time charter bookings and special events",            customer_id=None,      vehicle_id=None,default_revenue=2500, default_driver_payroll=500, recurrence="one_time"),
            dict(name="Corporate Contracts",      type="route",    description="Regular corporate shuttle services",                      customer_id=c_corp,    vehicle_id=v7,  default_revenue=1100, default_driver_payroll=380, recurrence="weekly"),
            dict(name="City Transit Support",     type="route",    description="Metro Transit Authority support routes",                  customer_id=c_metro,   vehicle_id=v8,  default_revenue=1500, default_driver_payroll=520, recurrence="daily"),
            dict(name="Medical Transport",        type="route",    description="Non-emergency medical transport runs",                    customer_id=c_medical, vehicle_id=v6,  default_revenue=650,  default_driver_payroll=200, recurrence="weekly"),
        ]
        jg_ids: list[int] = []
        for jg in JOB_GROUPS:
            obj = db.query(JobGroup).filter_by(company_id=cid, name=jg["name"]).first()
            if not obj:
                obj = JobGroup(company_id=cid, **jg)
                db.add(obj)
                db.flush()
            jg_ids.append(obj.id)
        jg_school, jg_airport, jg_charter, jg_corp, jg_transit, jg_medical = jg_ids

        # ── Vehicle Fixed Costs ───────────────────────────────
        FIXED_COST_TEMPLATES = [
            dict(type="loan",           costs=[1200, 1450, 800,  1350, 950,  1100, 1050, 1250, 1300, 1150]),
            dict(type="eld",            costs=[40,   45,   35,   42,   38,   44,   41,   43,   39,   40  ]),
            dict(type="management_fee", costs=[150,  150,  150,  150,  150,  150,  150,  150,  150,  150 ]),
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

        # ── Insurance Policies ────────────────────────────────
        INSURANCE = [
            dict(vehicle_id=v0, provider="State Farm",      policy_number="SF-10001", cost=890,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v1, provider="Progressive",     policy_number="PR-20002", cost=820,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v2, provider="State Farm",      policy_number="SF-10003", cost=760,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v3, provider="Geico",           policy_number="GE-30004", cost=950,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v5, provider="Progressive",     policy_number="PR-20006", cost=1050, type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v6, provider="Allstate",        policy_number="AL-40007", cost=780,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v7, provider="State Farm",      policy_number="SF-10008", cost=840,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v8, provider="Geico",           policy_number="GE-30009", cost=920,  type="monthly", start_date="2024-01-01", end_date=None),
            dict(vehicle_id=v9, provider="Allstate",        policy_number="AL-40010", cost=870,  type="monthly", start_date="2024-01-01", end_date=None),
        ]
        for ins in INSURANCE:
            exists = db.query(InsurancePolicy).filter_by(
                company_id=cid, policy_number=ins["policy_number"]
            ).first()
            if not exists:
                db.add(InsurancePolicy(company_id=cid, notes="", **ins))

        # ── Parking Entries ───────────────────────────────────
        PARKING = [
            dict(vehicle_id=v0, type="monthly", cost=250, date=None,         notes="Depot lot A"),
            dict(vehicle_id=v1, type="monthly", cost=250, date=None,         notes="Depot lot A"),
            dict(vehicle_id=v3, type="monthly", cost=300, date=None,         notes="Airport overflow lot"),
            dict(vehicle_id=v6, type="monthly", cost=250, date=None,         notes="Depot lot B"),
            dict(vehicle_id=v7, type="monthly", cost=300, date=None,         notes="Midtown garage"),
            dict(vehicle_id=v8, type="monthly", cost=275, date=None,         notes="City depot"),
            dict(vehicle_id=v2, type="one_time", cost=180, date="2026-02-15",notes="Body shop parking"),
        ]
        for p in PARKING:
            exists = db.query(ParkingEntry).filter_by(
                company_id=cid, vehicle_id=p["vehicle_id"], type=p["type"], cost=p["cost"]
            ).first()
            if not exists:
                db.add(ParkingEntry(company_id=cid, **p))

        # ── Maintenance Entries ───────────────────────────────
        MAINTENANCE = [
            dict(vehicle_id=v0, date="2026-01-08", description="Oil change + filter",       cost=180,  technician="A. Smith",   odometer=144100, notes=""),
            dict(vehicle_id=v0, date="2026-03-15", description="Brake pad replacement",     cost=620,  technician="A. Smith",   odometer=145230, notes="Front and rear"),
            dict(vehicle_id=v1, date="2026-01-20", description="Tire rotation",             cost=95,   technician="B. Jones",   odometer=97800,  notes=""),
            dict(vehicle_id=v1, date="2026-02-28", description="AC system service",         cost=340,  technician="B. Jones",   odometer=98450,  notes="Refrigerant recharge"),
            dict(vehicle_id=v2, date="2026-01-10", description="Engine diagnostic",         cost=150,  technician="C. Rivera",  odometer=209000, notes="Check engine light"),
            dict(vehicle_id=v2, date="2026-02-05", description="Alternator replacement",    cost=850,  technician="C. Rivera",  odometer=210000, notes="Original failed"),
            dict(vehicle_id=v3, date="2026-02-12", description="Oil change",                cost=165,  technician="A. Smith",   odometer=67200,  notes=""),
            dict(vehicle_id=v5, date="2026-01-25", description="Battery replacement",       cost=280,  technician="D. Kim",     odometer=33900,  notes="Cold weather failure"),
            dict(vehicle_id=v6, date="2026-03-01", description="Oil change + tire rotate",  cost=220,  technician="B. Jones",   odometer=78500,  notes=""),
            dict(vehicle_id=v7, date="2026-01-15", description="Transmission service",      cost=490,  technician="C. Rivera",  odometer=155200, notes="Fluid and filter"),
            dict(vehicle_id=v8, date="2026-02-20", description="Brake inspection",          cost=120,  technician="A. Smith",   odometer=44800,  notes="All clear"),
            dict(vehicle_id=v9, date="2026-03-10", description="Suspension check",          cost=200,  technician="D. Kim",     odometer=197500, notes="Minor wear noted"),
            dict(vehicle_id=v0, date="2025-11-05", description="Annual DOT inspection",     cost=350,  technician="A. Smith",   odometer=142000, notes="Passed"),
            dict(vehicle_id=v1, date="2025-12-18", description="Oil change",                cost=175,  technician="B. Jones",   odometer=96000,  notes=""),
        ]
        for m in MAINTENANCE:
            exists = db.query(MaintenanceEntry).filter_by(
                company_id=cid, vehicle_id=m["vehicle_id"], date=m["date"], description=m["description"]
            ).first()
            if not exists:
                db.add(MaintenanceEntry(company_id=cid, **m))

        # ── Fuel Entries ──────────────────────────────────────
        FUEL = [
            dict(vehicle_id=v0, date="2026-01-03",  gallons=45.2, cost_per_gallon=3.89, total=175.83, odometer=143200, driver_name="Michael Johnson",  notes=""),
            dict(vehicle_id=v0, date="2026-01-17",  gallons=42.8, cost_per_gallon=3.92, total=167.78, odometer=143900, driver_name="Michael Johnson",  notes=""),
            dict(vehicle_id=v0, date="2026-02-04",  gallons=44.1, cost_per_gallon=3.85, total=169.79, odometer=144600, driver_name="Michael Johnson",  notes=""),
            dict(vehicle_id=v0, date="2026-03-01",  gallons=43.5, cost_per_gallon=3.88, total=168.78, odometer=145000, driver_name="Michael Johnson",  notes=""),
            dict(vehicle_id=v1, date="2026-01-06",  gallons=38.4, cost_per_gallon=3.89, total=149.38, odometer=97200,  driver_name="Sarah Williams",   notes=""),
            dict(vehicle_id=v1, date="2026-01-27",  gallons=40.1, cost_per_gallon=3.91, total=156.79, odometer=97900,  driver_name="Sarah Williams",   notes=""),
            dict(vehicle_id=v1, date="2026-02-18",  gallons=39.2, cost_per_gallon=3.87, total=151.70, odometer=98300,  driver_name="Sarah Williams",   notes=""),
            dict(vehicle_id=v2, date="2026-01-12",  gallons=52.0, cost_per_gallon=3.90, total=202.80, odometer=209500, driver_name="Robert Davis",    notes="In for repair"),
            dict(vehicle_id=v3, date="2026-01-04",  gallons=41.5, cost_per_gallon=3.89, total=161.44, odometer=66800,  driver_name="Emily Chen",      notes=""),
            dict(vehicle_id=v3, date="2026-01-21",  gallons=40.8, cost_per_gallon=3.92, total=159.94, odometer=67200,  driver_name="Emily Chen",      notes=""),
            dict(vehicle_id=v3, date="2026-02-10",  gallons=42.3, cost_per_gallon=3.86, total=163.28, odometer=67600,  driver_name="Emily Chen",      notes=""),
            dict(vehicle_id=v3, date="2026-03-05",  gallons=41.9, cost_per_gallon=3.91, total=163.83, odometer=67890,  driver_name="Emily Chen",      notes=""),
            dict(vehicle_id=v5, date="2026-01-09",  gallons=35.6, cost_per_gallon=3.89, total=138.48, odometer=33700,  driver_name="Maria Garcia",    notes=""),
            dict(vehicle_id=v5, date="2026-02-14",  gallons=34.9, cost_per_gallon=3.87, total=135.06, odometer=34000,  driver_name="Maria Garcia",    notes=""),
            dict(vehicle_id=v6, date="2026-01-08",  gallons=37.2, cost_per_gallon=3.88, total=144.34, odometer=78100,  driver_name="David Martinez",  notes=""),
            dict(vehicle_id=v6, date="2026-02-02",  gallons=36.8, cost_per_gallon=3.91, total=143.89, odometer=78500,  driver_name="David Martinez",  notes=""),
            dict(vehicle_id=v6, date="2026-03-08",  gallons=38.1, cost_per_gallon=3.85, total=146.69, odometer=78800,  driver_name="David Martinez",  notes=""),
            dict(vehicle_id=v7, date="2026-01-11",  gallons=43.7, cost_per_gallon=3.90, total=170.43, odometer=155600, driver_name="Lisa Anderson",   notes=""),
            dict(vehicle_id=v7, date="2026-02-08",  gallons=44.2, cost_per_gallon=3.88, total=171.50, odometer=156100, driver_name="Lisa Anderson",   notes=""),
            dict(vehicle_id=v7, date="2026-03-12",  gallons=43.1, cost_per_gallon=3.92, total=168.95, odometer=156780, driver_name="Lisa Anderson",   notes=""),
            dict(vehicle_id=v8, date="2026-01-14",  gallons=36.5, cost_per_gallon=3.89, total=142.00, odometer=44400,  driver_name="Michael Johnson", notes=""),
            dict(vehicle_id=v8, date="2026-02-22",  gallons=37.0, cost_per_gallon=3.86, total=142.82, odometer=44700,  driver_name="Michael Johnson", notes=""),
            dict(vehicle_id=v9, date="2026-01-19",  gallons=48.3, cost_per_gallon=3.90, total=188.37, odometer=197200, driver_name="Robert Davis",    notes=""),
            dict(vehicle_id=v9, date="2026-02-26",  gallons=47.8, cost_per_gallon=3.88, total=185.46, odometer=197800, driver_name="Robert Davis",    notes=""),
            dict(vehicle_id=v9, date="2026-03-20",  gallons=49.1, cost_per_gallon=3.91, total=192.08, odometer=198340, driver_name="Robert Davis",    notes=""),
            # Q4 2025
            dict(vehicle_id=v0, date="2025-10-10",  gallons=44.5, cost_per_gallon=3.95, total=175.78, odometer=141000, driver_name="Michael Johnson", notes=""),
            dict(vehicle_id=v0, date="2025-11-14",  gallons=43.8, cost_per_gallon=3.98, total=174.32, odometer=142000, driver_name="Michael Johnson", notes=""),
            dict(vehicle_id=v0, date="2025-12-12",  gallons=42.9, cost_per_gallon=4.02, total=172.46, odometer=143000, driver_name="Michael Johnson", notes=""),
            dict(vehicle_id=v1, date="2025-10-15",  gallons=39.6, cost_per_gallon=3.95, total=156.42, odometer=95000,  driver_name="Sarah Williams",  notes=""),
            dict(vehicle_id=v1, date="2025-12-08",  gallons=40.5, cost_per_gallon=4.01, total=162.41, odometer=96500,  driver_name="Sarah Williams",  notes=""),
        ]
        for f in FUEL:
            exists = db.query(FuelEntry).filter_by(
                company_id=cid, vehicle_id=f["vehicle_id"], date=f["date"]
            ).first()
            if not exists:
                db.add(FuelEntry(company_id=cid, **f))

        # ── Jobs (single-occurrence dispatches) ───────────────
        # Each row is one run. Groups of rows represent recurring schedules.
        today = "2026-04-28"
        JOBS = [
            # School District Routes — daily, Jan–Apr
            dict(name="School Route 1 — 2026-01-06", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-01-06", status="completed"),
            dict(name="School Route 1 — 2026-01-13", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-01-13", status="completed"),
            dict(name="School Route 1 — 2026-01-20", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-01-20", status="completed"),
            dict(name="School Route 1 — 2026-01-27", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-01-27", status="completed"),
            dict(name="School Route 1 — 2026-02-03", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-02-03", status="completed"),
            dict(name="School Route 1 — 2026-02-10", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-02-10", status="completed"),
            dict(name="School Route 1 — 2026-02-24", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-02-24", status="completed"),
            dict(name="School Route 1 — 2026-03-03", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-03-03", status="completed"),
            dict(name="School Route 1 — 2026-03-10", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=850,  start_date="2026-03-10", status="completed"),
            dict(name="School Route 1 — 2026-03-17", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date="2026-03-17", status="completed"),
            dict(name="School Route 1 — 2026-03-24", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date="2026-03-24", status="completed"),
            dict(name="School Route 1 — 2026-04-07", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date="2026-04-07", status="completed"),
            dict(name="School Route 1 — 2026-04-14", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date="2026-04-14", status="completed"),
            dict(name="School Route 1 — 2026-04-21", job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date="2026-04-21", status="completed"),
            dict(name="School Route 1 — " + today,   job_group_id=jg_school,  vehicle_id=v0, driver_id=d0, customer_id=c_school,  revenue=850,  driver_payroll=320, payments_received=0,    start_date=today,        status="scheduled"),

            # Airport Shuttle — daily, Jan–Apr
            dict(name="JFK Morning Shuttle — 2026-01-05", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-01-05", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-01-12", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-01-12", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-01-19", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-01-19", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-01-26", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-01-26", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-02-02", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-02-02", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-02-09", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-02-09", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-02-23", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-02-23", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-03-02", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-03-02", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-03-09", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=1200, start_date="2026-03-09", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-03-23", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date="2026-03-23", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-03-30", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date="2026-03-30", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-04-06", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date="2026-04-06", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-04-13", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date="2026-04-13", status="completed"),
            dict(name="JFK Morning Shuttle — 2026-04-20", job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date="2026-04-20", status="completed"),
            dict(name="JFK Morning Shuttle — " + today,  job_group_id=jg_airport, vehicle_id=v3, driver_id=d3, customer_id=c_airport, revenue=1200, driver_payroll=420, payments_received=0,    start_date=today,        status="scheduled"),

            # Charter & Special Events — one-time jobs
            dict(name="Wedding Charter — 2026-02-14",   job_group_id=jg_charter, vehicle_id=v5, driver_id=d5, customer_id=c_harbor, revenue=3500, driver_payroll=600, payments_received=3500, start_date="2026-02-14", status="completed"),
            dict(name="Stadium Concert — 2026-03-22",   job_group_id=jg_charter, vehicle_id=v5, driver_id=d5, customer_id=c_events, revenue=2800, driver_payroll=500, payments_received=2800, start_date="2026-03-22", status="completed"),
            dict(name="Corporate Offsite — 2026-04-10", job_group_id=jg_charter, vehicle_id=v5, driver_id=d1, customer_id=c_corp,   revenue=4200, driver_payroll=700, payments_received=0,    start_date="2026-04-10", status="completed"),
            dict(name="Prom Night Charter — 2026-05-16",job_group_id=jg_charter, vehicle_id=v5, driver_id=d5, customer_id=c_school, revenue=1800, driver_payroll=350, payments_received=0,    start_date="2026-05-16", status="scheduled"),

            # Corporate Contracts — weekly
            dict(name="Corporate HQ Shuttle — 2026-01-09", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-01-09", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-01-16", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-01-16", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-01-23", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-01-23", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-01-30", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-01-30", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-02-06", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-02-06", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-02-13", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-02-13", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-02-20", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=1100, start_date="2026-02-20", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-02-27", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-02-27", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-03-06", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-03-06", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-03-13", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-03-13", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-03-20", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-03-20", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-04-03", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-04-03", status="completed"),
            dict(name="Corporate HQ Shuttle — 2026-04-17", job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date="2026-04-17", status="completed"),
            dict(name="Corporate HQ Shuttle — " + today,  job_group_id=jg_corp, vehicle_id=v7, driver_id=d7, customer_id=c_corp, revenue=1100, driver_payroll=380, payments_received=0,    start_date=today,        status="scheduled"),

            # City Transit Support — daily
            dict(name="Route 15 Downtown — 2026-01-07",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-01-07",  status="completed"),
            dict(name="Route 15 Downtown — 2026-01-14",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-01-14",  status="completed"),
            dict(name="Route 15 Downtown — 2026-01-21",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-01-21",  status="completed"),
            dict(name="Route 15 Downtown — 2026-01-28",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-01-28",  status="completed"),
            dict(name="Route 15 Downtown — 2026-02-04",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-02-04",  status="completed"),
            dict(name="Route 15 Downtown — 2026-02-11",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-02-11",  status="completed"),
            dict(name="Route 15 Downtown — 2026-02-18",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-02-18",  status="completed"),
            dict(name="Route 15 Downtown — 2026-02-25",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-02-25",  status="completed"),
            dict(name="Route 15 Downtown — 2026-03-04",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-03-04",  status="completed"),
            dict(name="Route 15 Downtown — 2026-03-11",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=1500, start_date="2026-03-11",  status="completed"),
            dict(name="Route 15 Downtown — 2026-03-18",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date="2026-03-18",  status="completed"),
            dict(name="Route 15 Downtown — 2026-03-25",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date="2026-03-25",  status="completed"),
            dict(name="Route 15 Downtown — 2026-04-08",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date="2026-04-08",  status="completed"),
            dict(name="Route 15 Downtown — 2026-04-15",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date="2026-04-15",  status="completed"),
            dict(name="Route 15 Downtown — 2026-04-22",  job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date="2026-04-22",  status="completed"),
            dict(name="Route 15 Downtown — " + today,    job_group_id=jg_transit, vehicle_id=v8, driver_id=d2, customer_id=c_metro, revenue=1500, driver_payroll=520, payments_received=0,    start_date=today,         status="scheduled"),

            # Medical Transport — weekly
            dict(name="Riverside Medical Run — 2026-01-08",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=650, start_date="2026-01-08",  status="completed"),
            dict(name="Riverside Medical Run — 2026-01-22",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=650, start_date="2026-01-22",  status="completed"),
            dict(name="Riverside Medical Run — 2026-02-05",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=650, start_date="2026-02-05",  status="completed"),
            dict(name="Riverside Medical Run — 2026-02-19",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=650, start_date="2026-02-19",  status="completed"),
            dict(name="Riverside Medical Run — 2026-03-05",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=650, start_date="2026-03-05",  status="completed"),
            dict(name="Riverside Medical Run — 2026-03-19",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=0,   start_date="2026-03-19",  status="completed"),
            dict(name="Riverside Medical Run — 2026-04-02",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=0,   start_date="2026-04-02",  status="completed"),
            dict(name="Riverside Medical Run — 2026-04-16",  job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=0,   start_date="2026-04-16",  status="completed"),
            dict(name="Riverside Medical Run — " + today,   job_group_id=jg_medical, vehicle_id=v6, driver_id=d6, customer_id=c_medical, revenue=650, driver_payroll=200, payments_received=0,   start_date=today,         status="scheduled"),
        ]
        job_map: dict[str, int] = {}
        for j in JOBS:
            obj = db.query(Job).filter_by(company_id=cid, name=j["name"]).first()
            if not obj:
                obj = Job(company_id=cid, **j)
                db.add(obj)
                db.flush()
            job_map[j["name"]] = obj.id

        # ── Job Line Items ────────────────────────────────────
        def job_id(name: str) -> int | None:
            return job_map.get(name)

        JOB_LINE_ITEMS = [
            # Tolls on school route
            dict(job_id=job_id("School Route 1 — 2026-01-06"),  date="2026-01-06", category="Toll",          direction="cost",   amount=12.50, notes="E-ZPass"),
            dict(job_id=job_id("School Route 1 — 2026-01-13"),  date="2026-01-13", category="Toll",          direction="cost",   amount=12.50, notes="E-ZPass"),
            dict(job_id=job_id("School Route 1 — 2026-01-20"),  date="2026-01-20", category="Toll",          direction="cost",   amount=12.50, notes="E-ZPass"),
            dict(job_id=job_id("School Route 1 — 2026-02-03"),  date="2026-02-03", category="Toll",          direction="cost",   amount=12.50, notes="E-ZPass"),
            dict(job_id=job_id("School Route 1 — 2026-02-10"),  date="2026-02-10", category="Toll",          direction="cost",   amount=12.50, notes="E-ZPass"),
            # Extra income on airport runs (luggage handling tips)
            dict(job_id=job_id("JFK Morning Shuttle — 2026-01-05"), date="2026-01-05", category="Gratuity",  direction="income", amount=80.00, notes="Client gratuity"),
            dict(job_id=job_id("JFK Morning Shuttle — 2026-01-12"), date="2026-01-12", category="Gratuity",  direction="income", amount=65.00, notes="Client gratuity"),
            dict(job_id=job_id("JFK Morning Shuttle — 2026-02-02"), date="2026-02-02", category="Gratuity",  direction="income", amount=75.00, notes="Client gratuity"),
            dict(job_id=job_id("JFK Morning Shuttle — 2026-02-09"), date="2026-02-09", category="Gratuity",  direction="income", amount=90.00, notes="Client gratuity"),
            # Parking fees on corporate shuttle
            dict(job_id=job_id("Corporate HQ Shuttle — 2026-01-09"), date="2026-01-09", category="Parking", direction="cost",   amount=35.00, notes="Midtown garage"),
            dict(job_id=job_id("Corporate HQ Shuttle — 2026-01-16"), date="2026-01-16", category="Parking", direction="cost",   amount=35.00, notes="Midtown garage"),
            dict(job_id=job_id("Corporate HQ Shuttle — 2026-02-06"), date="2026-02-06", category="Parking", direction="cost",   amount=35.00, notes="Midtown garage"),
            # Charter extras
            dict(job_id=job_id("Wedding Charter — 2026-02-14"),   date="2026-02-14", category="Decoration surcharge", direction="income", amount=250.00, notes="Client add-on"),
            dict(job_id=job_id("Wedding Charter — 2026-02-14"),   date="2026-02-14", category="Tolls",                direction="cost",   amount=22.00,  notes="Bridge tolls"),
            dict(job_id=job_id("Stadium Concert — 2026-03-22"),   date="2026-03-22", category="Overtime",             direction="income", amount=400.00, notes="Late finish premium"),
            dict(job_id=job_id("Stadium Concert — 2026-03-22"),   date="2026-03-22", category="Fuel surcharge",       direction="cost",   amount=55.00,  notes="Extra mileage"),
            dict(job_id=job_id("Corporate Offsite — 2026-04-10"), date="2026-04-10", category="Catering reimbursement",direction="income",amount=180.00, notes="Client request"),
        ]
        for li in JOB_LINE_ITEMS:
            if li["job_id"] is None:
                continue
            exists = db.query(JobLineItem).filter_by(
                company_id=cid, job_id=li["job_id"], date=li["date"],
                category=li["category"], direction=li["direction"]
            ).first()
            if not exists:
                db.add(JobLineItem(company_id=cid, notes=li.get("notes", ""), **{k: v for k, v in li.items() if k != "notes"}))

        # ── G&A Entries (2025 + 2026) ─────────────────────────
        GA_ENTRIES = [
            # 2025
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
            dict(category="Salaries",         date="2025-05-15", amount=8200),
            dict(category="Salaries",         date="2025-06-15", amount=8200),
            dict(category="Salaries",         date="2025-07-15", amount=8200),
            dict(category="Salaries",         date="2025-08-15", amount=8200),
            dict(category="Salaries",         date="2025-09-15", amount=8500),
            dict(category="Salaries",         date="2025-10-15", amount=8500),
            dict(category="Salaries",         date="2025-11-15", amount=8500),
            dict(category="Salaries",         date="2025-12-15", amount=8500),
            dict(category="Utilities",        date="2025-01-10", amount=320),
            dict(category="Utilities",        date="2025-02-10", amount=310),
            dict(category="Utilities",        date="2025-03-10", amount=290),
            dict(category="Utilities",        date="2025-04-10", amount=275),
            dict(category="Utilities",        date="2025-05-10", amount=260),
            dict(category="Utilities",        date="2025-06-10", amount=380),
            dict(category="Utilities",        date="2025-07-10", amount=420),
            dict(category="Utilities",        date="2025-08-10", amount=415),
            dict(category="Utilities",        date="2025-09-10", amount=360),
            dict(category="Utilities",        date="2025-10-10", amount=295),
            dict(category="Utilities",        date="2025-11-10", amount=305),
            dict(category="Utilities",        date="2025-12-10", amount=330),
            dict(category="Accounting & Tax", date="2025-03-20", amount=1500),
            dict(category="Accounting & Tax", date="2025-09-15", amount=800),
            dict(category="Insurance (G&A)",  date="2025-01-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-02-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-03-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-04-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-05-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-06-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-07-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-08-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-09-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-10-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-11-01", amount=600),
            dict(category="Insurance (G&A)",  date="2025-12-01", amount=600),
            dict(category="Software & Tools", date="2025-01-05", amount=299),
            dict(category="Software & Tools", date="2025-04-05", amount=299),
            dict(category="Software & Tools", date="2025-07-05", amount=299),
            dict(category="Software & Tools", date="2025-10-05", amount=299),
            # 2026
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
            dict(category="Utilities",        date="2026-04-10", amount=370),
            dict(category="Accounting & Tax", date="2026-01-25", amount=800),
            dict(category="Insurance (G&A)",  date="2026-01-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-02-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-03-01", amount=650),
            dict(category="Insurance (G&A)",  date="2026-04-01", amount=650),
            dict(category="Software & Tools", date="2026-01-05", amount=320),
            dict(category="Software & Tools", date="2026-04-05", amount=320),
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
