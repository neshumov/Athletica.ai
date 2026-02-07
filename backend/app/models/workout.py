from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Workout(Base):
    __tablename__ = "workout"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    subjective_fatigue: Mapped[int] = mapped_column(Integer)
    workout_quality: Mapped[str] = mapped_column(String(16))
    program_day_id: Mapped[int | None] = mapped_column(ForeignKey("program_day.id"))


class WorkoutExercise(Base):
    __tablename__ = "workout_exercise"

    workout_id: Mapped[int] = mapped_column(
        ForeignKey("workout.id"), primary_key=True
    )
    exercise_name: Mapped[str] = mapped_column(String(128), primary_key=True)
    set_number: Mapped[int] = mapped_column(Integer, primary_key=True)
    exercise_type: Mapped[str] = mapped_column(String(16), default="strength")
    muscle_group: Mapped[str | None] = mapped_column(String(64))
    equipment: Mapped[str | None] = mapped_column(String(64))
    reps: Mapped[int] = mapped_column(Integer)
    weight_kg: Mapped[float] = mapped_column(Float)
    rpe: Mapped[float] = mapped_column(Float)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
