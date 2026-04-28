from decimal import Decimal
from sqlalchemy import String, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class JobGroup(Base, EntityMixin):
    __tablename__ = "job_groups"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False, default="route")  # route | one_time
    description: Mapped[str] = mapped_column(Text, default="")
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    default_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    default_driver_payroll: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    recurrence: Mapped[str] = mapped_column(String(20), nullable=False, default="one_time")


class Job(Base, EntityMixin):
    __tablename__ = "jobs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_group_id: Mapped[int] = mapped_column(
        ForeignKey("job_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    driver_payroll: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payments_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="active")  # active | completed | scheduled


class JobLineItem(Base, EntityMixin):
    __tablename__ = "job_line_items"

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    direction: Mapped[str] = mapped_column(String(6), nullable=False)  # cost | income
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
