from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class GoalCreate(BaseModel):
    goal_type: str
    start_date: date
    end_date: date | None = None
    priority_muscle_groups: list[str] | None = None


class GoalOut(BaseModel):
    id: int
    goal_type: str
    start_date: date
    end_date: date | None
    priority_muscle_groups: list[str] | None
    is_active: bool
