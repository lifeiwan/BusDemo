from decimal import Decimal
from sqlalchemy import String, Integer, Boolean, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class Vehicle(Base, EntityMixin):
    __tablename__ = "vehicles"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    vin: Mapped[str] = mapped_column(String(17), default="")
    license_plate: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active | maintenance | out_of_service
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(50), default="")


class VehicleFixedCost(Base, EntityMixin):
    __tablename__ = "vehicle_fixed_costs"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # loan | eld | management_fee
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    notes: Mapped[str] = mapped_column(Text, default="")


class InsurancePolicy(Base, EntityMixin):
    __tablename__ = "insurance_policies"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(200), default="")
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # monthly | yearly
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")


class ParkingEntry(Base, EntityMixin):
    __tablename__ = "parking_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # monthly | one_time
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    location: Mapped[str] = mapped_column(String(255), default="")
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, default="")


class MaintenanceEntry(Base, EntityMixin):
    __tablename__ = "maintenance_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tech: Mapped[str] = mapped_column(String(100), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class FuelEntry(Base, EntityMixin):
    __tablename__ = "fuel_entries"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    gallons: Mapped[Decimal] = mapped_column(Numeric(8, 3), nullable=False)
    cpg: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    odometer: Mapped[int] = mapped_column(Integer, default=0)
    full: Mapped[bool] = mapped_column(Boolean, default=False)


class Inspection(Base, EntityMixin):
    __tablename__ = "inspections"

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    driver_name: Mapped[str] = mapped_column(String(200), default="")
    results: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    pass_: Mapped[bool] = mapped_column("pass", Boolean, nullable=False, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")
