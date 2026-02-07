from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NutritionDaily(Base):
    __tablename__ = "nutrition_daily"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    calories: Mapped[int] = mapped_column(Integer)
    protein_g: Mapped[float] = mapped_column(Float)
    fat_g: Mapped[float] = mapped_column(Float)
    carbs_g: Mapped[float] = mapped_column(Float)
