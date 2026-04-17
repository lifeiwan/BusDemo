from sqlalchemy import String, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, EntityMixin


class GaEntry(Base, EntityMixin):
    __tablename__ = "ga_entries"

    category: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
