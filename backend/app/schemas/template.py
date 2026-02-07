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
    target_sets: int | None = None


class WorkoutTemplateExercisesSave(BaseModel):
    exercises: list[WorkoutTemplateExerciseCreate]
