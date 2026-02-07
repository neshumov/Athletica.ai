from __future__ import annotations

from pydantic import BaseModel


class ProgramCreate(BaseModel):
    name: str


class ProgramOut(BaseModel):
    id: int
    name: str
    is_active: bool


class ProgramDayCreate(BaseModel):
    day_name: str


class ProgramDayOut(BaseModel):
    id: int
    program_id: int
    day_name: str


class ProgramExerciseCreate(BaseModel):
    exercise_type: str = "strength"
    exercise_name: str
    muscle_group: str | None = None
    equipment: str | None = None
    target_sets: int
    target_reps: int
    target_weight_kg: float | None = None
    target_duration_minutes: int | None = None


class ProgramExerciseOut(BaseModel):
    id: int
    program_day_id: int
    exercise_type: str
    exercise_name: str
    muscle_group: str | None
    equipment: str | None
    target_sets: int
    target_reps: int
    target_weight_kg: float | None
    target_duration_minutes: int | None
