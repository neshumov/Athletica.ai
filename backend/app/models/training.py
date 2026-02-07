from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TrainingProgram(Base):
    __tablename__ = "training_program"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ProgramDay(Base):
    __tablename__ = "program_day"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("training_program.id"))
    day_name: Mapped[str] = mapped_column(String(32))


class ProgramExercise(Base):
    __tablename__ = "program_exercise"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_day_id: Mapped[int] = mapped_column(ForeignKey("program_day.id"))
    exercise_type: Mapped[str] = mapped_column(String(16), default="strength")
    exercise_name: Mapped[str] = mapped_column(String(128))
    muscle_group: Mapped[str | None] = mapped_column(String(64))
    equipment: Mapped[str | None] = mapped_column(String(64))
    target_sets: Mapped[int] = mapped_column(Integer)
    target_reps: Mapped[int] = mapped_column(Integer)
    target_weight_kg: Mapped[float | None] = mapped_column(Float)
    target_duration_minutes: Mapped[int | None] = mapped_column(Integer)
