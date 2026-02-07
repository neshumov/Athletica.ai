from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class NutritionCreate(BaseModel):
    date: date
    calories: int = Field(ge=0)
    protein_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)


class NutritionOut(BaseModel):
    date: date
    calories: int
    protein_g: float
    fat_g: float
    carbs_g: float
