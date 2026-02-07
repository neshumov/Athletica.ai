from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.nutrition import NutritionDaily
from app.schemas.nutrition import NutritionCreate, NutritionOut

router = APIRouter(tags=["nutrition"])


@router.get("/nutrition", response_model=list[NutritionOut])
def list_nutrition(
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[NutritionOut]:
    query = db.query(NutritionDaily)
    if start:
        query = query.filter(NutritionDaily.date >= start)
    if end:
        query = query.filter(NutritionDaily.date <= end)
    rows = query.order_by(NutritionDaily.date.desc()).all()
    return [NutritionOut.model_validate(r.__dict__) for r in rows]


@router.post("/nutrition", response_model=NutritionOut)
def upsert_nutrition(payload: NutritionCreate, db: Session = Depends(get_db)) -> NutritionOut:
    row = db.query(NutritionDaily).filter(NutritionDaily.date == payload.date).first()
    if not row:
        row = NutritionDaily(date=payload.date)
        db.add(row)
    row.calories = payload.calories
    row.protein_g = payload.protein_g
    row.fat_g = payload.fat_g
    row.carbs_g = payload.carbs_g
    db.commit()
    return NutritionOut.model_validate(row.__dict__)
