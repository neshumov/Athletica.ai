from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class CalendarWorkoutExerciseIn(BaseModel):
    exercise_id: int
    set_number: int
    reps: int | None = None
    weight_kg: float | None = None
    duration_minutes: int | None = None


class CalendarWorkoutCreate(BaseModel):
    date: date
    workout_template_id: int
    exercises: list[CalendarWorkoutExerciseIn]


class CalendarWorkoutOut(BaseModel):
    id: int
    date: date
    workout_template_id: int
    name_snapshot: str


class CalendarWorkoutDetail(BaseModel):
    id: int
    date: date
    workout_template_id: int
    name_snapshot: str
    exercises: list[CalendarWorkoutExerciseIn]
