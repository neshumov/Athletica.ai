from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class WorkoutExerciseIn(BaseModel):
    exercise_name: str
    set_number: int
    exercise_type: str = "strength"
    muscle_group: str | None = None
    equipment: str | None = None
    reps: int | None = None
    weight_kg: float | None = None
    rpe: float | None = None
    duration_minutes: int | None = None


class WorkoutCreate(BaseModel):
    date: date
    duration_minutes: int
    subjective_fatigue: int = Field(ge=1, le=10)
    workout_quality: str
    program_day_id: int | None = None
    exercises: list[WorkoutExerciseIn]
