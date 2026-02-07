from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkoutTemplate(Base):
    __tablename__ = "workout_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128))


class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercise"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workout_template_id: Mapped[int] = mapped_column(ForeignKey("workout_template.id"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercise.id"))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    target_sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
