from __future__ import annotations

from pydantic import BaseModel


class WorkoutTemplateCreate(BaseModel):
    name: str


class WorkoutTemplateOut(BaseModel):
    id: int
    name: str


class WorkoutTemplateExerciseCreate(BaseModel):
    exercise_id: int
    order_index: int = 0
    target_reps: int | None = None
