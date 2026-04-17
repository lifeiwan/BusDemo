from decimal import Decimal
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class Driver(Base, EntityMixin):
    __tablename__ = "drivers"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    license: Mapped[str] = mapped_column(String(50), default="")
    license_expiry: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    phone: Mapped[str] = mapped_column(String(30), default="")
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="active")  # active | inactive


class DriverVehicleAssignment(Base, EntityMixin):
    __tablename__ = "driver_vehicle_assignments"

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)


class DriverCost(Base, EntityMixin):
    __tablename__ = "driver_costs"

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # salary | bonus | reimbursement | other
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
