from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Float, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WhoopDaily(Base):
    __tablename__ = "whoop_daily"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    hrv: Mapped[float | None] = mapped_column(Float)
    resting_heart_rate: Mapped[float | None] = mapped_column(Float)
    recovery_score: Mapped[float | None] = mapped_column(Float)
    strain: Mapped[float | None] = mapped_column(Float)
    sleep_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    sleep_efficiency: Mapped[float | None] = mapped_column(Float)
    sleep_stages_json: Mapped[dict | None] = mapped_column(JSON)
    sleep_json: Mapped[dict | None] = mapped_column(JSON)
    recovery_json: Mapped[dict | None] = mapped_column(JSON)
    cycle_json: Mapped[dict | None] = mapped_column(JSON)
    workout_json: Mapped[list | None] = mapped_column(JSON)
    body_weight_kg: Mapped[float | None] = mapped_column(Float)
    missing_flag: Mapped[bool] = mapped_column(Boolean, default=False)
